"""Apple iTunes Search API (country=IN): albums + 30-s previews. Apple asks for ~20 calls/min.

Chosen over Deezer, whose charts and previews are unavailable from India (ADR-007).
Terms: previews must link back to the Apple store page (stored as an `apple_url` work link).
"""

import argparse
import re
from pathlib import Path
from typing import Any

from psycopg import Connection

from rhorverse.db import connection
from rhorverse.ingest.http import Http
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import add_links, upsert_works, work_id

SOURCE = "itunes"
SEARCH = "https://itunes.apple.com/search"
LOOKUP = "https://itunes.apple.com/lookup"
CHART = "https://rss.marketingtools.apple.com/api/v2/in/music/most-played/100/albums.json"
COUNTRY = "IN"
LOOKUP_BATCH = 150
BATCH = 50
ARTWORK_SIZE = 600
SEEDS = Path(__file__).parent / "seeds" / "music_artists.txt"

_ARTWORK = re.compile(r"/\d+x\d+bb\.(jpg|png|webp)$")
_NON_ALNUM = re.compile(r"[^0-9a-z]")


def client() -> Http:
    return Http(SOURCE, rate=20, per=60)


def seed_artists(path: Path = SEEDS) -> list[str]:
    lines = (line.strip() for line in path.read_text(encoding="utf-8").splitlines())
    return [line for line in lines if line and not line.startswith("#")]


def _key(name: str) -> str:
    return _NON_ALNUM.sub("", name.casefold())


def artwork(url: str | None, size: int = ARTWORK_SIZE) -> str | None:
    """Apple artwork URLs end in /<w>x<h>bb.jpg and resize by rewriting that segment."""
    return _ARTWORK.sub(rf"/{size}x{size}bb.\1", url) if url else None


def chart_ids(http: Http) -> list[int]:
    """India's top albums (Apple Music most-played), in rank order."""
    data = http.get_json(CHART)
    return [int(r["id"]) for r in data.get("feed", {}).get("results", [])]


def lookup(http: Http, ids: list[int]) -> list[dict[str, Any]]:
    """Album details for collection ids, in the order given (unknown ids are dropped)."""
    found: dict[int, dict[str, Any]] = {}
    for start in range(0, len(ids), LOOKUP_BATCH):
        chunk = ids[start : start + LOOKUP_BATCH]
        data = http.get_json(LOOKUP, params={"id": ",".join(map(str, chunk)), "country": COUNTRY})
        for r in data.get("results", []):
            if r.get("wrapperType") == "collection":
                found[r["collectionId"]] = r
    return [found[i] for i in ids if i in found]


def tracks(http: Http, collection_id: str, ttl_s: float = 86_400) -> list[dict[str, Any]]:
    """Songs on an album with their preview URLs, in disc/track order. Cached for a day."""
    data = http.get_json(
        LOOKUP, params={"id": collection_id, "entity": "song", "country": COUNTRY}, ttl_s=ttl_s
    )
    songs = [r for r in data.get("results", []) if r.get("wrapperType") == "track"]
    return sorted(songs, key=lambda r: (r.get("discNumber") or 1, r.get("trackNumber") or 0))


def is_single(album: dict[str, Any]) -> bool:
    return (album.get("collectionName") or "").endswith(" - Single")


def artist_albums(http: Http, artist: str, limit: int = 100) -> list[dict[str, Any]]:
    """The artist's albums and EPs (no singles, no other artists' records), best match first."""
    data = http.get_json(
        SEARCH,
        params={
            "term": artist,
            "entity": "album",
            "attribute": "artistTerm",
            "country": COUNTRY,
            "limit": limit,
        },
    )
    want = _key(artist)
    return [
        r
        for r in data.get("results", [])
        if r.get("wrapperType") == "collection"
        and want in _key(r.get("artistName") or "")
        and not is_single(r)
    ]


def chart_popularity(rank: int) -> float:
    """Apple gives no popularity number; chart rank (0-based) stands in, roughly on TMDB's scale."""
    return 1100.0 - 10 * rank


def search_popularity(position: int) -> float:
    return 300.0 / (1 + position)


def to_work_row(album: dict[str, Any], popularity: float) -> WorkRow:
    """iTunes collection → WorkRow. Pure; no I/O."""
    released = album.get("releaseDate") or ""
    genre = album.get("primaryGenreName")
    artist = album.get("artistName")
    image = artwork(album.get("artworkUrl100"))
    facets = {
        "artist": [artist] if artist else [],
        "genre": [genre] if genre else [],
        "tracks": [str(album["trackCount"])] if album.get("trackCount") else [],
        "explicit": ["yes"] if album.get("collectionExplicitness") == "explicit" else [],
    }
    return WorkRow(
        media="music",
        source=SOURCE,
        source_id=str(album["collectionId"]),
        title=album.get("collectionName") or "",
        year=int(released[:4]) if released[:4].isdigit() else None,
        overview=f"Album by {artist}." if artist else None,
        tags=[t for t in (genre, artist) if t],
        images={"square": image, "poster": image} if image else {},
        popularity=popularity,
        extra={k: v for k, v in facets.items() if v},
    )


def apple_links(album: dict[str, Any]) -> list[tuple[str, str]]:
    url = album.get("collectionViewUrl")
    return [("apple_url", url.split("?")[0])] if url else []


def collect(http: Http, cap: int, artists: list[str] | None = None) -> list[tuple[dict[str, Any], float]]:
    """Chart albums first, then each seed artist's albums, de-duplicated, best popularity kept."""
    picked: dict[int, tuple[dict[str, Any], float]] = {}

    def add(album: dict[str, Any], pop: float) -> None:
        cid = album["collectionId"]
        if cid not in picked or picked[cid][1] < pop:
            picked[cid] = (album, pop)

    for rank, album in enumerate(lookup(http, chart_ids(http))):
        add(album, chart_popularity(rank))
    for artist in artists if artists is not None else seed_artists():
        if len(picked) >= cap:
            break
        for pos, album in enumerate(artist_albums(http, artist)):
            add(album, search_popularity(pos))
    return list(picked.values())[:cap]


def store(conn: Connection, albums: list[tuple[dict[str, Any], float]]) -> int:
    """Upsert (album, popularity) pairs and their Apple store links. Returns rows written."""
    rows = [to_work_row(a, p) for a, p in albums]
    written = upsert_works(conn, rows)
    for row, (a, _) in zip(rows, albums, strict=True):
        add_links(conn, work_id(row), apple_links(a))
    return written


def run(cap: int = 1500, http: Http | None = None) -> int:
    """Fetch up to `cap` albums and upsert them. Returns rows written."""
    http = http or client()
    albums = collect(http, cap)
    written = 0
    for start in range(0, len(albums), BATCH):
        with connection() as conn:
            written += store(conn, albums[start : start + BATCH])
            conn.commit()
        print(f"[{SOURCE}] {written}/{len(albums)} written")
    print(f"[{SOURCE}] done: {written} albums")
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap", type=int, default=1500)
    run(parser.parse_args().cap)
