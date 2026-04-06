from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Groq (primary local LLM — fast, free tier, no local install)
    groq_api_key: str = ""
    groq_model: str = "llama3-8b-8192"

    # OpenAI (optional fallback)
    openai_api_key: str = ""

    # Local vector store (fallback)
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_collection: str = "infra_diagrams"

    # App
    log_level: str = "info"
    max_upload_size_mb: int = 10
    output_dir: str = "output"

    # AWS — core credentials (optional)
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # AWS Bedrock — primary LLM
    aws_bedrock_enabled: bool = False

    # AWS S3 — primary diagram storage
    aws_s3_enabled: bool = False
    aws_s3_bucket: str = ""

    # AWS DynamoDB — primary history store
    aws_dynamodb_enabled: bool = False
    aws_dynamodb_table: str = "infra-diagram-history"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
