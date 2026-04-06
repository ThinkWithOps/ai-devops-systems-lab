from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://restaurant:password@localhost:5432/restaurant_db"
    redis_url: str = "redis://localhost:6379"
    app_name: str = "Bella Roma Restaurant API"
    app_version: str = "1.0.0"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
