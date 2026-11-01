"""Steam GetOwnedGames for a public SteamID64."""

from collections.abc import Iterator
from dataclasses import dataclass


@dataclass(frozen=True)
class ImportedItem:
    title: str
    year: int | None = None
    watched_at: str | None = None
    rating: float | None = None


def parse(raw: str) -> Iterator[ImportedItem]:
    """TODO: implement parser."""
    raise NotImplementedError
