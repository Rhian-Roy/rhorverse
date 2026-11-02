"""Letterboxd export: watched.csv / ratings.csv / diary.csv (Name, Year, optional Rating, Watched Date)."""

import csv
import io
from collections.abc import Iterator
from dataclasses import dataclass


@dataclass(frozen=True)
class ImportedItem:
    title: str
    year: int | None = None
    watched_at: str | None = None
    rating: float | None = None


def _num[T: (int, float)](raw: str | None, cast: type[T]) -> T | None:
    try:
        return cast(raw) if raw and raw.strip() else None
    except ValueError:
        return None


def parse(raw: str) -> Iterator[ImportedItem]:
    """One item per film; for repeated (name, year) rows (diary rewatches) the latest watch wins."""
    reader = csv.DictReader(io.StringIO(raw.removeprefix("﻿")))
    if not {"Name", "Year"} <= set(reader.fieldnames or []):
        raise ValueError("not a Letterboxd export: expected Name and Year columns")
    latest: dict[tuple[str, int | None], ImportedItem] = {}
    for row in reader:
        name = (row.get("Name") or "").strip()
        if not name:
            continue
        item = ImportedItem(
            title=name,
            year=_num(row.get("Year"), int),
            watched_at=(row.get("Watched Date") or row.get("Date") or "").strip() or None,
            rating=_num(row.get("Rating"), float),
        )
        key = (name, item.year)
        prev = latest.get(key)
        if prev is None or (item.watched_at or "") >= (prev.watched_at or ""):
            latest[key] = item
    yield from latest.values()
