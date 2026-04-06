from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://ecommerce:ecommerce@localhost:5434/ecommerce"
    redis_url: str = "redis://localhost:6381"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    environment: str = "development"
    debug: bool = True

    model_config = {"env_file": ".env"}


settings = Settings()
