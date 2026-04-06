"""
CloudWatch log integration — optional AWS log source.

Enabled when CLOUDWATCH_ENABLED=true and AWS credentials are available
(via IAM instance profile on EC2, or AWS_* env vars locally).

Falls back silently to in-memory sample logs when unavailable.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger(__name__)

_ENABLED = os.getenv("CLOUDWATCH_ENABLED", "false").lower() == "true"
_REGION = os.getenv("AWS_REGION", "us-east-1")
_LOG_GROUP = os.getenv("CLOUDWATCH_LOG_GROUP", "/ai-devops-copilot/app")


def is_enabled() -> bool:
    return _ENABLED


def search_cloudwatch_logs(query: str, limit: int = 20) -> list[dict[str, Any]]:
    """
    Query CloudWatch Logs Insights for matching log events.
    Returns [] if CloudWatch is disabled or credentials are unavailable.
    """
    if not _ENABLED:
        return []

    try:
        import boto3
        client = boto3.client("logs", region_name=_REGION)

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=6)

        # Build a simple Logs Insights query
        cw_query = f"fields @timestamp, @message | filter @message like /{query}/ | sort @timestamp desc | limit {limit}"

        response = client.start_query(
            logGroupName=_LOG_GROUP,
            startTime=int(start_time.timestamp()),
            endTime=int(end_time.timestamp()),
            queryString=cw_query,
        )
        query_id = response["queryId"]

        # Poll for results (max 10s)
        import time
        for _ in range(10):
            result = client.get_query_results(queryId=query_id)
            if result["status"] in ("Complete", "Failed", "Cancelled"):
                break
            time.sleep(1)

        logs = []
        for row in result.get("results", []):
            row_dict = {field["field"]: field["value"] for field in row}
            logs.append({
                "timestamp": row_dict.get("@timestamp", ""),
                "severity": _infer_severity(row_dict.get("@message", "")),
                "service": "cloudwatch",
                "message": row_dict.get("@message", ""),
            })
        return logs

    except Exception as e:
        logger.warning("CloudWatch query failed, falling back to local logs: %s", e)
        return []


def get_recent_cloudwatch_logs(limit: int = 50) -> list[dict[str, Any]]:
    """
    Fetch recent log events directly from CloudWatch.
    Returns [] if CloudWatch is disabled or credentials are unavailable.
    """
    if not _ENABLED:
        return []

    try:
        import boto3
        client = boto3.client("logs", region_name=_REGION)

        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=1)

        # Get log streams
        streams_resp = client.describe_log_streams(
            logGroupName=_LOG_GROUP,
            orderBy="LastEventTime",
            descending=True,
            limit=3,
        )
        streams = [s["logStreamName"] for s in streams_resp.get("logStreams", [])]

        logs = []
        for stream in streams:
            events_resp = client.get_log_events(
                logGroupName=_LOG_GROUP,
                logStreamName=stream,
                startTime=int(start_time.timestamp() * 1000),
                endTime=int(end_time.timestamp() * 1000),
                limit=limit // max(len(streams), 1),
            )
            for event in events_resp.get("events", []):
                ts = datetime.fromtimestamp(event["timestamp"] / 1000, tz=timezone.utc).isoformat()
                message = event.get("message", "").strip()
                logs.append({
                    "timestamp": ts,
                    "severity": _infer_severity(message),
                    "service": "cloudwatch",
                    "message": message,
                })

        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return logs[:limit]

    except Exception as e:
        logger.warning("CloudWatch recent logs failed, falling back to local logs: %s", e)
        return []


def _infer_severity(message: str) -> str:
    msg = message.upper()
    if "ERROR" in msg or "FATAL" in msg or "EXCEPTION" in msg:
        return "ERROR"
    if "WARN" in msg or "WARNING" in msg:
        return "WARN"
    return "INFO"
