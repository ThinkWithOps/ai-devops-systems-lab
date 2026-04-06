from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # LLM — Groq (preferred) or Ollama (local fallback)
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    github_token: str = ""
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    # Restaurant demo app — for cross-app monitoring
    restaurant_api_url: str = "http://host.docker.internal:8010"
    # AWS — optional, auto-enabled on EC2 via IAM instance profile
    cloudwatch_enabled: bool = False
    aws_region: str = "us-east-1"
    cloudwatch_log_group: str = "/ai-devops-copilot/app"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
