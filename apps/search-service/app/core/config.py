from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    node_env: str = Field(default="development", alias="NODE_ENV")
    port: int = Field(default=3005, alias="PORT")

    elasticsearch_url: str = Field(alias="ELASTICSEARCH_URL")

    rabbitmq_url: str = Field(alias="RABBITMQ_URL")
    rabbitmq_exchange: str = Field(default="taskflow.events", alias="RABBITMQ_EXCHANGE")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
