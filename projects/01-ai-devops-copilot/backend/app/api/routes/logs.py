from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.log_service import LogService
from app.services.vector_service import VectorService
from app.services import cloudwatch_service

router = APIRouter()
_log_service: LogService | None = None
_vector_service: VectorService | None = None


def get_log_service() -> LogService:
    global _log_service
    if _log_service is None:
        _log_service = LogService()
    return _log_service


def get_vector_service() -> VectorService:
    global _vector_service
    if _vector_service is None:
        _vector_service = VectorService()
    return _vector_service


class IngestLogsRequest(BaseModel):
    logs: list[dict]


@router.get("/logs/search")
async def search_logs(
    q: str = Query(default="recent", description="Search query"),
    limit: int = Query(default=20, ge=1, le=100),
):
    log_svc = get_log_service()
    vector_svc = get_vector_service()

    # 1. Try CloudWatch (when running on AWS with CLOUDWATCH_ENABLED=true)
    cw_results = cloudwatch_service.search_cloudwatch_logs(q, limit=limit)
    if cw_results:
        return {"logs": cw_results, "source": "cloudwatch"}

    # 2. Try vector search
    try:
        vector_results = vector_svc.search_logs(q, n_results=limit)
        if vector_results:
            return {"logs": vector_results, "source": "vector"}
    except Exception:
        pass

    # 3. Fallback to in-memory log service
    results = log_svc.search_logs(q)[:limit]
    return {"logs": results, "source": "memory"}


@router.post("/logs/ingest")
async def ingest_logs(request: IngestLogsRequest):
    vector_svc = get_vector_service()
    try:
        vector_svc.ingest_logs(request.logs)
        return {"status": "ok", "ingested": len(request.logs)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/logs/recent")
async def recent_logs(limit: int = Query(default=50, ge=1, le=200)):
    # Prefer CloudWatch on AWS
    cw_results = cloudwatch_service.get_recent_cloudwatch_logs(limit=limit)
    if cw_results:
        return {"logs": cw_results, "source": "cloudwatch"}

    log_svc = get_log_service()
    return {"logs": log_svc.get_recent_logs(limit), "source": "memory"}
