"""Prometheus metrics exposition endpoint."""
from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from app.middleware.metrics import update_failure_gauges

router = APIRouter()


@router.get("/metrics")
async def metrics():
    """
    Expose Prometheus metrics in text format.
    Scraped by Prometheus at the /metrics endpoint.
    """
    update_failure_gauges()
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
