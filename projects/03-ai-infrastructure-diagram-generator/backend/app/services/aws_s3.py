"""
AWS S3 diagram storage — primary store for generated PNG diagrams.

Uploads rendered diagrams to S3 and returns presigned URLs (valid 7 days).
Falls back to local filesystem serving when S3 is not configured.

Toggle: set AWS_S3_ENABLED=true + AWS_S3_BUCKET in environment.
"""
import os
import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()


def _s3_client():
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def upload_diagram_to_s3(local_path: str, diagram_id: str) -> str:
    """
    Upload a PNG file to S3 and return a presigned URL.
    Returns the S3 key on success.
    """
    client = _s3_client()
    s3_key = f"diagrams/{diagram_id}.png"
    client.upload_file(
        local_path,
        settings.aws_s3_bucket,
        s3_key,
        ExtraArgs={"ContentType": "image/png"},
    )
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.aws_s3_bucket, "Key": s3_key},
        ExpiresIn=604800,  # 7 days
    )
    return url


def s3_available() -> bool:
    return bool(
        settings.aws_s3_enabled
        and settings.aws_s3_bucket
        and settings.aws_region
    )


def ensure_bucket_exists() -> None:
    """Create the S3 bucket if it does not exist. Safe to call on startup."""
    if not s3_available():
        return
    client = _s3_client()
    try:
        client.head_bucket(Bucket=settings.aws_s3_bucket)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            if settings.aws_region == "us-east-1":
                client.create_bucket(Bucket=settings.aws_s3_bucket)
            else:
                client.create_bucket(
                    Bucket=settings.aws_s3_bucket,
                    CreateBucketConfiguration={"LocationConstraint": settings.aws_region},
                )
