import json
from pathlib import Path

import httpx
import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.config import get_settings
from rhorverse.db import get_conn
from rhorverse.ingest import rawg
from rhorverse.ingest.http import Http
from rhorverse.main import create_app

FIX = Path(__file__).parent / "fixtures" / "rawg"


def load(name: str) -> dict:
    return json.loads((FIX / name).read_text())


def games() -> list[dict]:
    return load("list_page1.json")["results"]


def fake_http(tmp_path: Path, seen: list[httpx.Request]) -> Http:
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        path = request.url.path
        if path == "/api/games":
            return httpx.Response(200, json=load(f"list_page{request.url.params['page']}.json"))
        if path == "/api/games/3498":
            return httpx.Response(200, json=load("detail_3498.json"))
        return httpx.Response(200, json={"id": int(path.rsplit("/", 1)[1])})

    client = httpx.Client(transport=httpx.MockTransport(handler), params={"key": "test-key"})
    return Http("rawg", rate=1000, cache_root=tmp_path, client=client)


def test_row_mapping_with_detail():
    row = rawg.to_work_row(games()[0], load("detail_3498.json"))
    assert (row.media, row.source, row.source_id) == ("game", "rawg", "3498")
    assert (row.title, row.year, row.popularity) == ("Grand Theft Auto V", 2013, 2150.0)
    assert row.overview.startswith("Rockstar Games went bigger")
    assert row.images["capsule"] == row.images["backdrop"]
    assert row.extra["platforms"] == ["PC", "PlayStation"]
    assert row.extra["avg playtime"] == ["74 h"]
    assert row.extra["developer"] == ["Rockstar North"]


def test_only_english_tags_and_no_zero_playtime():
    gta = rawg.to_work_row(games()[0])
    assert gta.tags == ["Action", "Singleplayer", "Open World"]
    hk = rawg.to_work_row(games()[1])
    assert "avg playtime" not in hk.extra
    assert "metacritic" not in hk.extra
    assert hk.overview is None


def test_adult_games_are_flagged():
    adult = load("list_page2.json")["results"][0]
    assert rawg.is_adult(adult)
    assert not any(rawg.is_adult(g) for g in games())
    assert rawg.is_adult({"esrb_rating": {"slug": "adults-only"}, "tags": []})


def test_fetch_list_pages_and_sends_key(tmp_path: Path):
    seen: list[httpx.Request] = []
    items = rawg.fetch_list(fake_http(tmp_path, seen), cap=10)
    assert [g["id"] for g in items] == [3498, 9767, 55555]
    assert len(seen) == 2
    assert all(r.url.params["key"] == "test-key" for r in seen)
    assert seen[0].url.params["ordering"] == "-added"
    assert len(rawg.fetch_list(fake_http(tmp_path / "b", []), cap=1)) == 1


def test_client_needs_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(get_settings(), "rawg_api_key", None)
    with pytest.raises(SystemExit):
        rawg.client()


def test_store_is_idempotent_and_detail_has_rawg_link(conn: psycopg.Connection, tmp_path: Path):
    http = fake_http(tmp_path, [])
    pairs = [(g, rawg.details(http, g["id"])) for g in games()]
    assert rawg.store(conn, pairs) == 2
    conn.execute(
        "update works set embedding = array_fill(0.1::real, array[384])::vector where id = 'rawg:3498'"
    )
    rawg.store(conn, pairs)
    row = conn.execute(
        "select count(*) filter (where id in ('rawg:3498', 'rawg:9767')) as n, "
        "bool_and(embedding is not null) filter (where id = 'rawg:3498') as kept from works"
    ).fetchone()
    assert (row["n"], row["kept"]) == (2, True)


def test_work_detail_links_back_to_rawg(conn: psycopg.Connection, tmp_path: Path):
    rawg.store(conn, [(games()[0], None)])
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    detail = TestClient(app).get("/works/rawg:3498").json()
    assert detail["source_url"] == "https://rawg.io/games/grand-theft-auto-v"
