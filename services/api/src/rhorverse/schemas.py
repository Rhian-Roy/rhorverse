"""Pydantic response models. Mirrored by apps/web/src/lib/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field

MediaType = Literal["movie", "tv", "anime", "music", "game"]
TileVariant = Literal["poster", "landscape", "square", "capsule"]
ImportSource = Literal["netflix", "letterboxd", "anilist", "steam"]
EventKind = Literal["view", "like", "dislike", "save", "consumed", "skip"]


class ImageSet(BaseModel):
    poster: str | None = None
    backdrop: str | None = None
    square: str | None = None
    capsule: str | None = None


class Work(BaseModel):
    id: str
    media: MediaType
    title: str
    year: int | None = None
    overview: str | None = None
    tags: list[str] = Field(default_factory=list)
    images: ImageSet = Field(default_factory=ImageSet)
    source: str
    source_id: str


class Provider(BaseModel):
    name: str
    kind: Literal["flatrate", "rent", "buy", "free", "ads"]
    logo: str | None = None
    link: str | None = None


class WorkDetail(Work):
    facets: dict[str, list[str]] = Field(default_factory=dict)
    availability: list[Provider] = Field(default_factory=list)


class Explanation(BaseModel):
    because_id: str
    because_title: str
    reason: str


class Rail(BaseModel):
    id: str
    title: str
    variant: TileVariant = "poster"
    ranked: bool = False
    items: list[Work]
    explanation: Explanation | None = None


class HomeFeed(BaseModel):
    hero: list[Work]
    rails: list[Rail]


class SearchResult(BaseModel):
    query: str
    media: MediaType | None = None
    items: list[Work]


class EventIn(BaseModel):
    profile_id: str
    work_id: str
    kind: EventKind
    weight: float = 1.0


class EventAck(BaseModel):
    accepted: int


class TasteProfile(BaseModel):
    profile_id: str
    top_tags: list[str] = Field(default_factory=list)
    counts: dict[MediaType, int] = Field(default_factory=dict)


class ImportResult(BaseModel):
    source: ImportSource
    status: Literal["queued", "done", "failed"]
    matched: int = 0
    unmatched: int = 0


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    service: str = "api"
    version: str
    db: Literal["ok", "down", "skipped"] = "skipped"
