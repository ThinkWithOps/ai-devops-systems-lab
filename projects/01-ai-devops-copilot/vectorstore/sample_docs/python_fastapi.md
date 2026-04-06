# Python and FastAPI Troubleshooting Guide

## FastAPI Common Issues

### Slow Endpoints

```python
# Profile endpoint performance
import time
from fastapi import Request

@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    if duration > 1.0:
        logger.warning("slow_request", path=request.url.path, duration=duration)
    return response

# Use async for I/O-bound operations
@app.get("/orders")
async def get_orders(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).limit(100))
    return result.scalars().all()

# Background tasks for non-critical work
from fastapi import BackgroundTasks

@app.post("/orders")
async def create_order(order: OrderCreate, background_tasks: BackgroundTasks):
    db_order = await save_order(order)
    background_tasks.add_task(send_confirmation_email, db_order.id)
    return db_order
```

### Connection Pool Exhaustion

```python
# SQLAlchemy async with proper pool settings
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # Base connections
    max_overflow=20,       # Extra connections under load
    pool_timeout=30,       # Wait time for connection
    pool_recycle=1800,     # Recycle connections every 30 min
    pool_pre_ping=True,    # Test connection before using
)

# Always use context managers
async with AsyncSession(engine) as session:
    async with session.begin():
        result = await session.execute(query)
```

### Pydantic Validation Errors

```python
from pydantic import BaseModel, validator, Field
from typing import Optional

class OrderCreate(BaseModel):
    items: list[dict]
    table_id: int = Field(gt=0, description="Must be positive")
    customer_name: str = Field(min_length=1, max_length=100)
    payment_method: str

    @validator('payment_method')
    def validate_payment_method(cls, v):
        allowed = ['cash', 'card', 'online']
        if v not in allowed:
            raise ValueError(f"Payment method must be one of {allowed}")
        return v

    @validator('items')
    def validate_items_not_empty(cls, v):
        if not v:
            raise ValueError("Order must have at least one item")
        return v
```

### CORS Issues

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://myapp.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Python Performance Issues

### Blocking the Event Loop

```python
# BAD - blocks async event loop
@app.get("/process")
async def process():
    result = heavy_cpu_computation()  # Blocks for 5 seconds
    return result

# GOOD - run CPU-bound in thread pool
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

@app.get("/process")
async def process():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, heavy_cpu_computation)
    return result

# BEST for CPU-bound - use ProcessPoolExecutor
from concurrent.futures import ProcessPoolExecutor
process_executor = ProcessPoolExecutor(max_workers=4)
```

### Memory Issues

```python
# Generator for large datasets instead of loading all into memory
async def get_large_dataset():
    async with AsyncSession(engine) as session:
        result = await session.stream(select(Order))
        async for row in result:
            yield row

# StreamingResponse for large file downloads
from fastapi.responses import StreamingResponse
import io

@app.get("/export")
async def export_data():
    def generate():
        for batch in get_data_in_batches():
            yield batch.to_csv()

    return StreamingResponse(generate(), media_type="text/csv")
```

### Debugging Production Issues

```bash
# Check Python process memory
python -c "
import psutil, os
p = psutil.Process(os.getpid())
print(p.memory_info())
"

# Profile CPU usage
python -m cProfile -o output.prof myapp.py
python -m pstats output.prof

# Memory profiling
pip install memory-profiler
python -m memory_profiler app.py

# Check for circular imports
python -v -c "import app" 2>&1 | grep "import"
```

## Dependency Management

```bash
# Pin exact versions for reproducibility
pip freeze > requirements.txt

# Better: use pip-tools
pip install pip-tools
pip-compile requirements.in  # Generates requirements.txt with hashes

# Check for security vulnerabilities
pip install safety
safety check

# Check for outdated packages
pip list --outdated

# Virtual environment best practices
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

## FastAPI Deployment

```dockerfile
# Optimized FastAPI Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run with multiple workers for production
CMD ["uvicorn", "app.main:app",
     "--host", "0.0.0.0",
     "--port", "8000",
     "--workers", "4",
     "--loop", "uvloop",
     "--http", "httptools"]
```

```bash
# Health check endpoint (required for Docker/Kubernetes)
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow()}

# Graceful shutdown
import signal

def shutdown_handler(sig, frame):
    logger.info("Shutting down gracefully...")
    # Close database connections, flush queues, etc.
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown_handler)
```
