"""
ShopFlow — Ecommerce Demo Application
======================================
FastAPI backend with clear service boundaries designed as a demo target
for the AI GitHub Repo Explainer.

Architecture:
- ProductService: product catalog with category filtering and search
- CartService: session-based cart backed by PostgreSQL + Redis
- OrderService: order lifecycle management with price snapshots
- PaymentService: mock payment processor with configurable failure modes
- InventoryService: stock management with reservation/release semantics
- FailureService: injectable failure modes for operator demo scenarios
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_tables
from app.seed import seed_database
from app.database import AsyncSessionLocal
from app.middleware.metrics import PrometheusMiddleware
from app.api.routes import health, products, cart, checkout, orders, payments, admin
from app.api.routes.metrics_route import router as metrics_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer(),
    ]
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("shopflow_starting", version="1.0.0")

    # Create database tables
    await create_tables()
    logger.info("database_tables_created")

    # Seed initial data
    async with AsyncSessionLocal() as session:
        await seed_database(session)
        await session.commit()
    logger.info("seed_data_loaded")

    logger.info("shopflow_ready", port=8020)
    yield

    logger.info("shopflow_shutdown")


app = FastAPI(
    title="ShopFlow Ecommerce API",
    description=(
        "Demo ecommerce platform with injectable failure modes. "
        "Designed as a realistic codebase for the AI GitHub Repo Explainer."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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

# Prometheus metrics middleware
app.add_middleware(PrometheusMiddleware)

# API routes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(cart.router, prefix="/api", tags=["Cart"])
app.include_router(checkout.router, prefix="/api", tags=["Checkout"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])
app.include_router(metrics_router, tags=["Metrics"])


@app.get("/")
async def root():
    return {
        "service": "ShopFlow Ecommerce API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "metrics": "/metrics",
    }
