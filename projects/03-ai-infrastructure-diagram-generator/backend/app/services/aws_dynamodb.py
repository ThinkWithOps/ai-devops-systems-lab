"""
AWS DynamoDB history store — primary persistence layer for diagram metadata.

Stores diagram records with resource counts, providers, and AI summary.
Falls back to ChromaDB when DynamoDB is not configured.

Toggle: set AWS_DYNAMODB_ENABLED=true + AWS_DYNAMODB_TABLE in environment.
Table schema:
  PK: diagram_id (String)
  Attributes: title, resource_count, providers (StringSet), created_at, ai_summary
"""
import boto3
from boto3.dynamodb.conditions import Attr
from datetime import datetime
from typing import List, Dict, Any

from app.config import get_settings

settings = get_settings()


def _table():
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )
    return dynamodb.Table(settings.aws_dynamodb_table)


def dynamodb_available() -> bool:
    return bool(
        settings.aws_dynamodb_enabled
        and settings.aws_dynamodb_table
        and settings.aws_region
    )


def store_diagram_dynamo(
    diagram_id: str,
    title: str,
    resource_count: int,
    providers: List[str],
    ai_summary: str,
    image_url: str = "",
) -> None:
    table = _table()
    table.put_item(Item={
        "diagram_id": diagram_id,
        "title": title,
        "resource_count": resource_count,
        "providers": list(set(providers)) or ["generic"],
        "ai_summary": ai_summary,
        "image_url": image_url,
        "created_at": datetime.utcnow().isoformat(),
    })


def get_all_diagrams_dynamo() -> List[Dict[str, Any]]:
    table = _table()
    result = table.scan()
    items = result.get("Items", [])
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items


def get_metrics_dynamo() -> Dict[str, Any]:
    items = get_all_diagrams_dynamo()
    if not items:
        return {"total_diagrams": 0, "total_resources": 0, "avg_resources": 0.0, "provider_counts": {}}

    total_resources = sum(int(i.get("resource_count", 0)) for i in items)
    provider_counts: Dict[str, int] = {}
    for i in items:
        for p in i.get("providers", []):
            provider_counts[p] = provider_counts.get(p, 0) + 1

    return {
        "total_diagrams": len(items),
        "total_resources": total_resources,
        "avg_resources": total_resources / len(items),
        "provider_counts": provider_counts,
    }


def ensure_table_exists() -> None:
    """Create DynamoDB table if it does not exist. Safe to call on startup."""
    if not dynamodb_available():
        return
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )
    existing = [t.name for t in dynamodb.tables.all()]
    if settings.aws_dynamodb_table not in existing:
        dynamodb.create_table(
            TableName=settings.aws_dynamodb_table,
            KeySchema=[{"AttributeName": "diagram_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "diagram_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
