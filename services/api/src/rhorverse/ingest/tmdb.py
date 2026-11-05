"""TMDB: movies + TV, with IN watch providers (data by JustWatch). ~40 req/s allowed; we use 20."""

import argparse
from collections.abc import Iterable, Iterator
from typing import Any, Literal

from psycopg import Connection

from rhorverse.config import get_settings
from rhorverse.db import connection
from rhorverse.imports.match import Candidate, best_match
from rhorverse.ingest.http import Http
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import AvailabilityItem, add_links, replace_availability, upsert_works, work_id

SOURCE = "tmdb"
BASE = "https://api.themoviedb.org/3"
IMG = "https://image.tmdb.org/t/p"
REGION = "IN"
BATCH = 50

Kind = Literal["movie", "tv"]
KINDS: tuple[Kind, ...] = ("movie", "tv")
LISTS = ("trending", "popular", "top_rated")
INDIAN_LANGUAGES = ("hi", "ta", "te", "ml", "pa")
INDIA_SHARE = 0.4  # of each kind's cap, split across INDIAN_LANGUAGES
MAX_CAST = 8


def client() -> Http:
    token = get_settings().tmdb_read_token
    if not token:
        raise SystemExit("TMDB_READ_TOKEN is not set (add it to .env; see .env.example)")
    return Http(SOURCE, rate=20, headers={"Authorization": f"Bearer {token}"})


def _list_url(kind: Kind, name: str) -> str:
    return f"{BASE}/trending/{kind}/week" if name == "trending" else f"{BASE}/{kind}/{name}"


def _collect(http: Http, url: str, params: dict[str, Any], seen: dict[int, None], until: int) -> None:
    """Page through one TMDB list, adding ids to `seen` until it holds `until` or the list ends."""
    page = 1
    while len(seen) < until:
        data = http.get_json(url, params={**params, "page": page})
        for item in data.get("results", []):
            seen.setdefault(int(item["id"]), None)
        if page >= min(int(data.get("total_pages", 1)), 500):
            break
        page += 1


def candidates(http: Http, kind: Kind, n: int) -> list[int]:
    """Up to `n` distinct TMDB ids: a share of Indian-language titles, then trending/popular/top rated."""
    seen: dict[int, None] = {}
    per_language = int(n * INDIA_SHARE) // len(INDIAN_LANGUAGES)
    if per_language:
        for lang in INDIAN_LANGUAGES:
            params = {"with_original_language": lang, "sort_by": "popularity.desc", "watch_region": REGION}
            _collect(http, f"{BASE}/discover/{kind}", params, seen, len(seen) + per_language)
    for i, name in enumerate(LISTS):
        # Split what's left evenly, so trending alone can't fill the quota.
        until = len(seen) + (n - len(seen)) // (len(LISTS) - i)
        _collect(http, _list_url(kind, name), {}, seen, until)
    return list(seen)[:n]


def details(http: Http, kind: Kind, tmdb_id: int) -> dict[str, Any]:
    return http.get_json(
        f"{BASE}/{kind}/{tmdb_id}",
        params={"append_to_response": "keywords,watch/providers,external_ids,credits"},
    )


def _year(date: str | None) -> int | None:
    return int(date[:4]) if date and date[:4].isdigit() else None


def _img(path: str | None, size: str) -> str | None:
    return f"{IMG}/{size}{path}" if path else None


def to_work_row(kind: Kind, p: dict[str, Any]) -> WorkRow:
    """TMDB details payload → WorkRow. Pure; no I/O."""
    genres = [g["name"] for g in p.get("genres", [])]
    kw = p.get("keywords", {})
    keywords = [k["name"] for k in kw.get("keywords", kw.get("results", []))]
    images = {
        k: v
        for k, v in {
            "poster": _img(p.get("poster_path"), "w500"),
            "backdrop": _img(p.get("backdrop_path"), "w1280"),
        }.items()
        if v
    }
    runtime = p.get("runtime") or next(iter(p.get("episode_run_time") or []), None)
    return WorkRow(
        media=kind,
        source=SOURCE,
        source_id=f"{kind}/{p['id']}",
        title=p.get("title") or p.get("name") or "",
        year=_year(p.get("release_date") or p.get("first_air_date")),
        overview=p.get("overview") or None,
        tags=[*genres, *keywords],
        images=images,
        popularity=float(p.get("popularity") or 0),
        extra={
            "genres": genres,
            "keywords": keywords,
            "language": [p["original_language"]] if p.get("original_language") else [],
            "runtime_min": [str(runtime)] if runtime else [],
            "cast": [c["name"] for c in (p.get("credits") or {}).get("cast", [])[:MAX_CAST] if c.get("name")],
        },
    )


def providers_in(p: dict[str, Any], region: str = REGION) -> list[AvailabilityItem]:
    """Where-to-watch for `region` (data by JustWatch via TMDB)."""
    block = p.get("watch/providers", {}).get("results", {}).get(region, {})
    out: list[AvailabilityItem] = []
    for kind in ("flatrate", "rent", "buy", "free", "ads"):
        for prov in block.get(kind, []):
            out.append(
                AvailabilityItem(
                    prov["provider_name"], kind, block.get("link"), _img(prov.get("logo_path"), "w92")
                )
            )
    return out


def imdb_links(p: dict[str, Any]) -> list[tuple[str, str]]:
    imdb = p.get("imdb_id") or p.get("external_ids", {}).get("imdb_id")
    return [("imdb", imdb)] if imdb else []


def _batches(items: list[tuple[Kind, int]], size: int) -> Iterator[list[tuple[Kind, int]]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def store_payloads(conn: Connection, payloads: list[tuple[Kind, dict[str, Any]]]) -> list[str]:
    """Upsert detail payloads with their IN availability and IMDb links. Returns the work ids."""
    rows = [to_work_row(k, p) for k, p in payloads]
    upsert_works(conn, rows)
    ids = []
    for row, (_, p) in zip(rows, payloads, strict=True):
        wid = work_id(row)
        replace_availability(conn, wid, REGION, providers_in(p))
        add_links(conn, wid, imdb_links(p))
        ids.append(wid)
    return ids


def search_movie(http: Http, title: str, year: int | None) -> int | None:
    """TMDB id of the film matching title (+ year), or None. Only accepts a fuzzy-title match."""
    attempts = [{"primary_release_year": year}, {}] if year else [{}]
    for extra in attempts:
        data = http.get_json(
            f"{BASE}/search/movie", params={"query": title, "include_adult": "false", **extra}
        )
        cands = [
            Candidate(str(r["id"]), r.get("title") or "", _year(r.get("release_date")))
            for r in data.get("results", [])[:5]
        ]
        hit = best_match(title, year, cands)
        if hit:
            return int(hit.id)
    return None


def fetch_movies(
    conn: Connection, http: Http, items: Iterable[tuple[str, int | None]], max_lookups: int = 150
) -> int:
    """Search TMDB for films missing from `works` and ingest them. Returns how many were added."""
    found: list[int] = []
    for n, (title, year) in enumerate(items):
        if n >= max_lookups:
            break
        tmdb_id = search_movie(http, title, year)
        if tmdb_id is not None and tmdb_id not in found:
            found.append(tmdb_id)
    for start in range(0, len(found), BATCH):
        store_payloads(conn, [("movie", details(http, "movie", i)) for i in found[start : start + BATCH]])
    return len(found)


def run(cap: int = 100, http: Http | None = None) -> int:
    """Fetch up to `cap` titles (split across movies and TV) and upsert them. Returns rows written."""
    http = http or client()
    per_kind = {"movie": (cap + 1) // 2, "tv": cap // 2}
    ids = [(k, i) for k in KINDS for i in candidates(http, k, per_kind[k])]
    written = with_providers = 0
    for batch in _batches(ids, BATCH):
        payloads = [(k, details(http, k, i)) for k, i in batch]
        with connection() as conn:
            written += len(store_payloads(conn, payloads))
            with_providers += sum(bool(providers_in(p)) for _, p in payloads)
            conn.commit()
        print(f"[{SOURCE}] {written}/{len(ids)} written")
    print(f"[{SOURCE}] done: {written} works, {with_providers} with {REGION} providers")
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap", type=int, default=100)
    run(parser.parse_args().cap)
