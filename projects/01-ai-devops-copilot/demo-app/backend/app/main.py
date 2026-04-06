import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from app.api.routes import health, menu, reservations, orders, kitchen, payments, admin
from app.db.database import create_tables
from app.db.seed import seed_database
from app.services.metrics_service import metrics

# Configure structured JSON logging
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info(
        "restaurant_api_starting",
        service="restaurant-api",
        version="1.0.0",
        environment="demo",
    )

    # Create database tables
    create_tables()
    logger.info("database_tables_created")

    # Seed database with initial data
    seed_result = seed_database()
    logger.info("database_seed_complete", result=seed_result)

    # Initialize all failure mode gauges to 0
    for mode in ["slow_menu", "kitchen_down", "payment_timeout", "reservation_conflict", "db_slow"]:
        metrics.active_failures.labels(mode=mode).set(0)

    logger.info("restaurant_api_ready", message="Bella Roma Restaurant API is accepting requests")

    yield

    logger.info("restaurant_api_shutdown", message="Bella Roma Restaurant API shutting down")


app = FastAPI(
    title="Bella Roma Restaurant API",
    description="Restaurant ordering and reservation platform with built-in failure injection for AI DevOps demos",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for demo purposes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Prometheus Metrics Endpoint ──────────────────────────────────────────────

@app.get("/metrics", include_in_schema=False)
async def prometheus_metrics():
    """Expose Prometheus metrics for scraping by Prometheus / AI Copilot."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


# ─── Request Logging Middleware ───────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every HTTP request with method, path, and response status."""
    response = await call_next(request)

    # Skip metrics endpoint to avoid log noise
    if request.url.path != "/metrics":
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            client=request.client.host if request.client else "unknown",
        )
        metrics.http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status=str(response.status_code),
        ).inc()

    return response


# ─── API Routers ──────────────────────────────────────────────────────────────

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(menu.router, prefix="/api", tags=["Menu"])
app.include_router(reservations.router, prefix="/api", tags=["Reservations"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(kitchen.router, prefix="/api", tags=["Kitchen"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "Bella Roma Restaurant API",
        "version": "1.0.0",
        "docs": "/docs",
        "metrics": "/metrics",
        "health": "/api/health",
    }
