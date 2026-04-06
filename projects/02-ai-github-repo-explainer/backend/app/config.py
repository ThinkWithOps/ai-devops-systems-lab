from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # LLM — Groq (preferred) or Ollama (local fallback)
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # GitHub — optional token for higher rate limits (5000 req/hr vs 60 req/hr)
    github_token: str = ""

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8001

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
