import json
from pathlib import Path

import httpx

from rhorverse.ingest import tmdb
from rhorverse.ingest.http import Http

FIX = Path(__file__).parent / "fixtures" / "tmdb"


def load(name: str) -> dict:
    return json.loads((FIX / name).read_text())


def test_movie_to_work_row():
    row = tmdb.to_work_row("movie", load("movie_603.json"))
    assert (row.media, row.source, row.source_id) == ("movie", "tmdb", "movie/603")
    assert row.title == "The Matrix"
    assert row.year == 1999
    assert row.tags == ["Action", "Science Fiction", "simulation", "dystopia"]
    assert row.images["poster"] == "https://image.tmdb.org/t/p/w500/matrix-poster.jpg"
    assert row.extra["runtime_min"] == ["136"]


def test_tv_to_work_row_handles_missing_fields():
    row = tmdb.to_work_row("tv", load("tv_1396.json"))
    assert row.source_id == "tv/1396"
    assert row.title == "Breaking Bad"
    assert row.year == 2008
    assert "backdrop" not in row.images
    assert row.tags == ["Drama", "drug dealer"]
    assert row.extra["runtime_min"] == ["47"]


def test_providers_are_region_in_only():
    items = tmdb.providers_in(load("movie_603.json"))
    assert [(i.provider, i.kind) for i in items] == [("Netflix", "flatrate"), ("Google Play Movies", "rent")]
    assert items[0].link and "locale=IN" in items[0].link
    assert tmdb.providers_in(load("tv_1396.json")) == []


def test_imdb_links_from_either_shape():
    assert tmdb.imdb_links(load("movie_603.json")) == [("imdb", "tt0133093")]
    assert tmdb.imdb_links(load("tv_1396.json")) == [("imdb", "tt0903747")]
    assert tmdb.imdb_links({}) == []


def make_http(tmp_path: Path, seen: list[httpx.Request]) -> Http:
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=load("list_page1.json"))

    client = httpx.Client(
        transport=httpx.MockTransport(handler), headers={"Authorization": "Bearer test-token"}
    )
    return Http("tmdb", rate=1000, cache_root=tmp_path, client=client)


def test_candidates_dedupe_and_cap(tmp_path: Path):
    seen: list[httpx.Request] = []
    http = make_http(tmp_path, seen)
    assert tmdb.candidates(http, "movie", 5) == [603, 604]
    assert tmdb.candidates(http, "movie", 1) == [603]
    assert all(r.headers["Authorization"] == "Bearer test-token" for r in seen)
