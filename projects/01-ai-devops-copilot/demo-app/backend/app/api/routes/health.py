from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import redis as redis_client
import structlog

from app.db.database import get_db
from app.config import get_settings

router = APIRouter()
logger = structlog.get_logger()
settings = get_settings()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint. Verifies connectivity to PostgreSQL and Redis.
    Used by Docker healthcheck and monitoring systems.
    """
    db_healthy = False
    redis_healthy = False

    # Check database
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as e:
        logger.error("health_check_db_failed", error=str(e))

    # Check Redis
    try:
        r = redis_client.from_url(settings.redis_url, socket_connect_timeout=2)
        r.ping()
        redis_healthy = True
    except Exception as e:
        logger.error("health_check_redis_failed", error=str(e))

    overall_status = "ok" if (db_healthy and redis_healthy) else "degraded"

    logger.info(
        "health_check",
        status=overall_status,
        database=db_healthy,
        redis=redis_healthy,
    )

    return {
        "status": overall_status,
        "service": "restaurant-api",
        "version": "1.0.0",
        "database": db_healthy,
        "redis": redis_healthy,
    }
