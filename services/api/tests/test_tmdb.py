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


def route_http(tmp_path: Path, seen: list[httpx.Request]) -> Http:
    """Search → search_matrix.json (empty for unknown titles); /movie/603 → movie_603.json."""

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path.endswith("/search/movie"):
            if "matrix" in request.url.params["query"].lower():
                return httpx.Response(200, json=load("search_matrix.json"))
            return httpx.Response(200, json={"results": []})
        if request.url.path.endswith("/movie/603"):
            return httpx.Response(200, json=load("movie_603.json"))
        return httpx.Response(404, json={})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    return Http("tmdb", rate=1000, cache_root=tmp_path, client=client)


def test_search_movie_picks_the_title_match_not_the_top_hit(tmp_path: Path):
    http = route_http(tmp_path, [])
    assert tmdb.search_movie(http, "The Matrix", 1999) == 603
    assert tmdb.search_movie(http, "Nothing Like It", 2001) is None


def test_search_retries_without_year(tmp_path: Path):
    seen: list[httpx.Request] = []
    assert tmdb.search_movie(route_http(tmp_path, seen), "Unknown", 1990) is None
    assert [("primary_release_year" in r.url.params) for r in seen] == [True, False]


def test_fetch_movies_ingests_found_films(tmp_path: Path, conn):
    added = tmdb.fetch_movies(conn, route_http(tmp_path, []), [("The Matrix", 1999), ("Nope", None)])
    assert added == 1
    row = conn.execute("select title from works where id = 'tmdb:movie/603'").fetchone()
    assert row["title"] == "The Matrix"


def test_fetch_movies_respects_lookup_cap(tmp_path: Path, conn):
    seen: list[httpx.Request] = []
    tmdb.fetch_movies(
        conn, route_http(tmp_path, seen), [("A", None), ("B", None), ("C", None)], max_lookups=2
    )
    assert len(seen) == 2


def test_candidates_ask_for_indian_languages_first(tmp_path: Path):
    seen: list[httpx.Request] = []
    tmdb.candidates(make_http(tmp_path, seen), "movie", 50)
    langs = [r.url.params.get("with_original_language") for r in seen if "/discover/" in r.url.path]
    assert langs == list(tmdb.INDIAN_LANGUAGES)
    assert seen[0].url.params["watch_region"] == "IN"


def test_small_caps_skip_the_india_share(tmp_path: Path):
    seen: list[httpx.Request] = []
    tmdb.candidates(make_http(tmp_path, seen), "movie", 5)
    assert not any("/discover/" in r.url.path for r in seen)


def test_cast_comes_from_credits_and_is_capped():
    payload = {**load("movie_603.json"), "credits": {"cast": [{"name": f"Actor {i}"} for i in range(12)]}}
    cast = tmdb.to_work_row("movie", payload).extra["cast"]
    assert cast == [f"Actor {i}" for i in range(tmdb.MAX_CAST)]
    assert tmdb.to_work_row("movie", load("movie_603.json")).extra["cast"] == []
