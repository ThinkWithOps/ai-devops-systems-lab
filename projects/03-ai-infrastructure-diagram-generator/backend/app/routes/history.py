from fastapi import APIRouter
from typing import List

from app.schemas.diagram import DiagramHistoryItem
from app.services.aws_dynamodb import dynamodb_available, get_all_diagrams_dynamo
from app.services.vector_store import get_all_diagrams

router = APIRouter()


@router.get("", response_model=List[DiagramHistoryItem])
async def get_history():
    if dynamodb_available():
        items = get_all_diagrams_dynamo()
    else:
        items = get_all_diagrams()

    return [
        DiagramHistoryItem(
            diagram_id=item["diagram_id"],
            title=item["title"],
            resource_count=int(item.get("resource_count", 0)),
            providers=item.get("providers", []),
            created_at=item.get("created_at", ""),
            image_url=item.get("image_url") or None,
        )
        for item in items
    ]
