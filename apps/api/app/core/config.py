from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from ..domain.accounts import Account

REPOSITORY_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "Voice Mod API"
    app_version: str = "0.3.0"
    allowed_users: list[Account] = Field(
        default_factory=list,
        validation_alias="ALLOWED_USERS_JSON",
    )
    cors_origins: str = Field(
        default="http://localhost:8081,http://127.0.0.1:8081",
        validation_alias="CORS_ORIGINS",
    )

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        return ",".join(origins)

    @property
    def allowed_origins(self) -> list[str]:
        return self.cors_origins.split(",") if self.cors_origins else []


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
