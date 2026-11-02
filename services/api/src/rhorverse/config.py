"""Settings loaded from the environment (and the repo-root .env in local dev)."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _find_repo_root() -> Path:
    here = Path(__file__).resolve()
    return next((p for p in here.parents if (p / "justfile").exists()), Path.cwd())


REPO_ROOT = _find_repo_root()


DEFAULT_CORS_ORIGINS = ("http://localhost:3000",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    database_url: str | None = None
    tmdb_read_token: str | None = None
    twitch_client_id: str | None = None
    twitch_client_secret: str | None = None
    rawg_api_key: str | None = None
    lastfm_api_key: str | None = None
    steam_web_api_key: str | None = None
    gemini_api_key: str | None = None
    musicbrainz_user_agent: str = "Rhorverse/0.1 ( https://github.com/Rhian-Roy )"
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: list(DEFAULT_CORS_ORIGINS))
    data_dir: Path = REPO_ROOT / "data"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            # An empty CORS_ORIGINS= (as in .env.example) means "unset", not "allow nothing".
            return [o.strip() for o in v.split(",") if o.strip()] or list(DEFAULT_CORS_ORIGINS)
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
