"""Health check endpoint — verifies database and Redis connectivity."""
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.config import settings
import redis as redis_sync

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Check connectivity to all downstream dependencies.

    Returns status of:
    - API server itself
    - PostgreSQL database
    - Redis cache
    """
    health = {
        "status": "healthy",
        "service": "shopflow-backend",
        "environment": settings.environment,
        "checks": {},
    }

    # Check PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        health["checks"]["postgres"] = {"status": "connected", "latency_ms": None}
    except Exception as e:
        health["checks"]["postgres"] = {"status": "error", "error": str(e)}
        health["status"] = "degraded"

    # Check Redis
    try:
        redis_client = redis_sync.from_url(settings.redis_url, decode_responses=True)
        redis_client.ping()
        health["checks"]["redis"] = {"status": "connected"}
    except Exception as e:
        health["checks"]["redis"] = {"status": "error", "error": str(e)}
        health["status"] = "degraded"

    return health
