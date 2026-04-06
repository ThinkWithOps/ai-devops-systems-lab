from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import structlog
import os

from app.routes import diagrams, health, history, metrics
from app.services.aws_s3 import ensure_bucket_exists, s3_available
from app.services.aws_dynamodb import ensure_table_exists, dynamodb_available

logger = structlog.get_logger()

app = FastAPI(
    title="AI Infrastructure Diagram Generator",
    description="Turn Terraform/IaC code into visual architecture diagrams using AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated diagram images
os.makedirs("output", exist_ok=True)
app.mount("/output", StaticFiles(directory="output"), name="output")

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(diagrams.router, prefix="/api/diagrams", tags=["diagrams"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])


@app.on_event("startup")
async def startup_event():
    logger.info("AI Infrastructure Diagram Generator started")
    if s3_available():
        try:
            ensure_bucket_exists()
            logger.info("S3 bucket ready", bucket=get_settings().aws_s3_bucket)
        except Exception as e:
            logger.warning("S3 init failed — diagrams will use local storage", error=str(e))
    if dynamodb_available():
        try:
            ensure_table_exists()
            logger.info("DynamoDB table ready", table=get_settings().aws_dynamodb_table)
        except Exception as e:
            logger.warning("DynamoDB init failed — history will use ChromaDB", error=str(e))


def get_settings():
    from app.config import get_settings as _get
    return _get()
