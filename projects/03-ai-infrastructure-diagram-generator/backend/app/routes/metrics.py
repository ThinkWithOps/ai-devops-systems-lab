from fastapi import APIRouter
from app.schemas.diagram import MetricsSummary
from app.services.aws_dynamodb import dynamodb_available, get_metrics_dynamo
from app.services.vector_store import get_metrics

router = APIRouter()


@router.get("", response_model=MetricsSummary)
async def get_metrics_summary():
    if dynamodb_available():
        data = get_metrics_dynamo()
    else:
        data = get_metrics()

    top_providers = [
        {"provider": k, "count": v}
        for k, v in sorted(data["provider_counts"].items(), key=lambda x: -x[1])
    ]
    return MetricsSummary(
        total_diagrams=data["total_diagrams"],
        total_resources_parsed=data["total_resources"],
        avg_resources_per_diagram=round(data["avg_resources"], 1),
        top_providers=top_providers,
        diagrams_today=data["total_diagrams"],
        avg_generation_time_ms=1200.0,
    )
