"""AniList GraphQL: popular anime. Documented 90 req/min (currently degraded to 30); we use 25/min."""

import argparse
import re
from typing import Any

from psycopg import Connection

from rhorverse.db import connection
from rhorverse.ingest.http import Http
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import add_links, upsert_works, work_id

SOURCE = "anilist"
URL = "https://graphql.anilist.co"
PER_PAGE = 50
BATCH = 50
MIN_TAG_RANK = 60
MAX_TAGS = 15
# AniList popularity is a member count (up to ~4M); TMDB's is ~0-1000. Bring them roughly level.
POPULARITY_SCALE = 1 / 1000

QUERY = """
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id idMal
      title { romaji english native }
      description(asHtml: false)
      genres
      tags { name rank isMediaSpoiler isGeneralSpoiler }
      coverImage { extraLarge }
      bannerImage
      seasonYear startDate { year }
      episodes format averageScore popularity
    }
  }
}
"""

_SPOILER = re.compile(r"~!.*?!~", re.S)
_TAG = re.compile(r"<[^>]+>")
_SOURCE_NOTE = re.compile(r"\(\s*Source:[^)]*\)\s*$", re.I)


def client() -> Http:
    return Http(SOURCE, rate=25, per=60)


def fetch(http: Http, cap: int) -> list[dict[str, Any]]:
    """Most popular anime first, paged until `cap` items or the last page."""
    items: list[dict[str, Any]] = []
    page = 1
    while len(items) < cap:
        data = http.post_json(URL, body={"query": QUERY, "variables": {"page": page, "perPage": PER_PAGE}})
        block = data["data"]["Page"]
        items.extend(block["media"])
        if not block["pageInfo"]["hasNextPage"]:
            break
        page += 1
    return items[:cap]


def clean_description(text: str | None) -> str | None:
    """Plain text with inline ~!spoilers!~, HTML and the trailing "(Source: …)" note removed."""
    if not text:
        return None
    t = _SPOILER.sub(" ", text)
    t = _TAG.sub(" ", t)
    t = " ".join(t.split())
    t = _SOURCE_NOTE.sub("", t).strip()
    return t or None


def public_tags(m: dict[str, Any]) -> list[str]:
    """Genres plus strong, non-spoiler tags. Spoiler tags are never stored."""
    tags = [
        t["name"]
        for t in sorted(m.get("tags") or [], key=lambda t: -(t.get("rank") or 0))
        if not (t.get("isMediaSpoiler") or t.get("isGeneralSpoiler")) and (t.get("rank") or 0) >= MIN_TAG_RANK
    ]
    return [*(m.get("genres") or []), *tags][:MAX_TAGS]


def to_work_row(m: dict[str, Any]) -> WorkRow:
    """AniList Media → WorkRow. Pure; no I/O."""
    title = m.get("title") or {}
    images = {
        k: v
        for k, v in {
            "poster": (m.get("coverImage") or {}).get("extraLarge"),
            "backdrop": m.get("bannerImage"),
        }.items()
        if v
    }
    return WorkRow(
        media="anime",
        source=SOURCE,
        source_id=str(m["id"]),
        title=title.get("english") or title.get("romaji") or "",
        year=m.get("seasonYear") or (m.get("startDate") or {}).get("year"),
        overview=clean_description(m.get("description")),
        tags=public_tags(m),
        images=images,
        popularity=float(m.get("popularity") or 0) * POPULARITY_SCALE,
        extra={
            k: v
            for k, v in {
                "genres": m.get("genres") or [],
                "format": [m["format"]] if m.get("format") else [],
                "episodes": [str(m["episodes"])] if m.get("episodes") else [],
                "score": [str(m["averageScore"])] if m.get("averageScore") else [],
                "romaji": [title["romaji"]]
                if title.get("romaji") and title.get("romaji") != title.get("english")
                else [],
                "native": [title["native"]] if title.get("native") else [],
            }.items()
            if v
        },
    )


def mal_links(m: dict[str, Any]) -> list[tuple[str, str]]:
    return [("mal", str(m["idMal"]))] if m.get("idMal") else []


def store(conn: Connection, media: list[dict[str, Any]]) -> int:
    """Upsert anime rows and their MyAnimeList links. Returns rows written."""
    rows = [to_work_row(m) for m in media]
    written = upsert_works(conn, rows)
    for row, m in zip(rows, media, strict=True):
        add_links(conn, work_id(row), mal_links(m))
    return written


def run(cap: int = 1000, http: Http | None = None) -> int:
    """Fetch up to `cap` anime and upsert them. Returns rows written."""
    http = http or client()
    media = fetch(http, cap)
    written = 0
    for start in range(0, len(media), BATCH):
        with connection() as conn:
            written += store(conn, media[start : start + BATCH])
            conn.commit()
        print(f"[{SOURCE}] {written}/{len(media)} written")
    print(f"[{SOURCE}] done: {written} anime")
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap", type=int, default=1000)
    run(parser.parse_args().cap)
