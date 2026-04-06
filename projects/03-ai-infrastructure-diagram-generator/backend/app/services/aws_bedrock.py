"""
AWS Bedrock LLM client — primary LLM for AI architecture summaries.

Uses Claude Haiku via Bedrock for fast, cost-effective inference.
Falls back to Groq when AWS credentials are not configured.

Toggle: set AWS_BEDROCK_ENABLED=true and ensure AWS credentials are present.
"""
import json
import boto3
from typing import Optional

from app.config import get_settings

settings = get_settings()

BEDROCK_MODEL_ID = "anthropic.claude-haiku-20240307-v1:0"

SUMMARY_SYSTEM = (
    "You are a senior cloud architect. Given a list of infrastructure resources "
    "parsed from Terraform, write a concise 3–5 sentence architecture summary. "
    "Explain: what the infrastructure does, how the key components connect, "
    "the likely deployment pattern, and any notable design decisions. "
    "Be specific about providers and resource types. Do not hallucinate resources not in the list."
)


def _bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def generate_summary_bedrock(resource_list: str, title: str) -> str:
    """Call Bedrock Claude Haiku to generate an architecture summary."""
    client = _bedrock_client()
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 512,
        "system": SUMMARY_SYSTEM,
        "messages": [
            {
                "role": "user",
                "content": f"Resources:\n{resource_list}\n\nTitle: {title}\n\nWrite the architecture summary:",
            }
        ],
    }
    response = client.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    result = json.loads(response["body"].read())
    return result["content"][0]["text"]


def bedrock_available() -> bool:
    return bool(
        settings.aws_bedrock_enabled
        and settings.aws_region
    )
