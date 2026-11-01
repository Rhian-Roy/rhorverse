"""Source payloads → unified `works` rows + "vibe text" used for embeddings."""

from dataclasses import dataclass, field
from typing import Any

from rhorverse.schemas import MediaType


@dataclass
class WorkRow:
    media: MediaType
    source: str
    source_id: str
    title: str
    year: int | None = None
    overview: str | None = None
    tags: list[str] = field(default_factory=list)
    images: dict[str, str] = field(default_factory=dict)
    popularity: float = 0.0
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def vibe_text(self) -> str:
        return vibe_text(self)


def vibe_text(row: WorkRow) -> str:
    """Compact natural-language description fed to the sentence embedder."""
    parts = [f"{row.title} ({row.media}{', ' + str(row.year) if row.year else ''})"]
    if row.tags:
        parts.append("Tags: " + ", ".join(sorted(set(row.tags))[:20]))
    if row.overview:
        parts.append(row.overview.strip()[:600])
    return ". ".join(parts)
