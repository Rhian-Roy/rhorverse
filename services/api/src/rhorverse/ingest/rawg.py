"""RAWG: games (the build plan's RAWG-only path until IGDB keys exist). 20k requests/month; we use 2/s.

Terms: an active hyperlink to RAWG on every page that uses its data (see the web footer + game page).
"""

import argparse
from typing import Any

import httpx
from psycopg import Connection

from rhorverse.config import get_settings
from rhorverse.db import connection
from rhorverse.ingest.http import DEFAULT_UA, Http
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import add_links, upsert_works, work_id

SOURCE = "rawg"
BASE = "https://api.rawg.io/api"
PAGE_SIZE = 40
BATCH = 50
MAX_TAGS = 15
# RAWG `added` (library adds) tops out around 20k; TMDB popularity is ~0-5700. Bring them roughly level.
POPULARITY_SCALE = 1 / 10
ADULT_TAGS = frozenset({"nsfw", "sexual-content", "hentai", "nudity"})


def client() -> Http:
    key = get_settings().rawg_api_key
    if not key:
        raise SystemExit("RAWG_API_KEY is not set (add it to .env; see .env.example)")
    # The key rides on the client, so it never becomes part of a cache key.
    http = httpx.Client(timeout=20.0, params={"key": key}, headers={"User-Agent": DEFAULT_UA})
    return Http(SOURCE, rate=2, client=http)


def fetch_list(http: Http, cap: int) -> list[dict[str, Any]]:
    """Most-added games first, paged until `cap` items or the last page."""
    games: list[dict[str, Any]] = []
    page = 1
    while len(games) < cap:
        data = http.get_json(
            f"{BASE}/games", params={"ordering": "-added", "page_size": PAGE_SIZE, "page": page}
        )
        games.extend(data.get("results") or [])
        if not data.get("next"):
            break
        page += 1
    return games[:cap]


def details(http: Http, game_id: int) -> dict[str, Any]:
    return http.get_json(f"{BASE}/games/{game_id}")


def is_adult(game: dict[str, Any]) -> bool:
    esrb = (game.get("esrb_rating") or {}).get("slug")
    return esrb == "adults-only" or any(t.get("slug") in ADULT_TAGS for t in game.get("tags") or [])


def _names(items: list[dict[str, Any]] | None, key: str | None = None) -> list[str]:
    return [(i[key] if key else i)["name"] for i in items or []]


def to_work_row(game: dict[str, Any], detail: dict[str, Any] | None = None) -> WorkRow:
    """RAWG list item (+ optional detail payload) → WorkRow. Pure; no I/O."""
    detail = detail or {}
    genres = _names(game.get("genres"))
    tags = [t["name"] for t in game.get("tags") or [] if t.get("language") == "eng"]
    released = game.get("released") or ""
    image = game.get("background_image")
    playtime = game.get("playtime") or 0
    description = (detail.get("description_raw") or "").strip()
    facets = {
        "platforms": _names(game.get("parent_platforms"), "platform"),
        "genres": genres,
        "avg playtime": [f"{playtime} h"] if playtime > 0 else [],
        "metacritic": [str(game["metacritic"])] if game.get("metacritic") else [],
        "developer": _names(detail.get("developers"))[:2],
        "publisher": _names(detail.get("publishers"))[:2],
    }
    return WorkRow(
        media="game",
        source=SOURCE,
        source_id=str(game["id"]),
        title=game.get("name") or "",
        year=int(released[:4]) if released[:4].isdigit() else None,
        overview=description[:1200] or None,
        tags=list(dict.fromkeys([*genres, *tags]))[:MAX_TAGS],
        images={"capsule": image, "backdrop": image} if image else {},
        popularity=float(game.get("added") or 0) * POPULARITY_SCALE,
        extra={k: v for k, v in facets.items() if v},
    )


def rawg_links(game: dict[str, Any]) -> list[tuple[str, str]]:
    return [("rawg_slug", game["slug"])] if game.get("slug") else []


def store(conn: Connection, games: list[tuple[dict[str, Any], dict[str, Any] | None]]) -> int:
    """Upsert (list item, detail) pairs and their RAWG slug links. Returns rows written."""
    rows = [to_work_row(g, d) for g, d in games]
    written = upsert_works(conn, rows)
    for row, (g, _) in zip(rows, games, strict=True):
        add_links(conn, work_id(row), rawg_links(g))
    return written


def run(cap: int = 1000, http: Http | None = None) -> int:
    """Fetch up to `cap` games (skipping adult ones) with details and upsert them. Returns rows written."""
    http = http or client()
    games = [g for g in fetch_list(http, cap) if not is_adult(g)]
    written = 0
    for start in range(0, len(games), BATCH):
        chunk = [(g, details(http, g["id"])) for g in games[start : start + BATCH]]
        with connection() as conn:
            written += store(conn, chunk)
            conn.commit()
        print(f"[{SOURCE}] {written}/{len(games)} written")
    print(f"[{SOURCE}] done: {written} games")
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap", type=int, default=1000)
    run(parser.parse_args().cap)
