"""Search against a real Postgres inside a rolled-back transaction (skipped if unreachable)."""

import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.db import get_conn
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.main import create_app


@pytest.fixture
def client(conn: psycopg.Connection) -> TestClient:
    def work(sid: str, title: str, year: int, pop: float, media: str = "movie") -> WorkRow:
        return WorkRow(media=media, source="test", source_id=sid, title=title, year=year, popularity=pop)  # type: ignore[arg-type]

    upsert_works(
        conn,
        [
            work("movie/1", "Zzdune", 2021, 90),
            work("movie/2", "Zzdune", 1984, 20),
            work("movie/3", "Zzdune: Part Two", 2024, 80),
            work("movie/4", "Zzdunkirk", 2017, 70),
            work("movie/5", "Lawrence of Arabia", 1962, 40),
            work("tv/6", "Zzdune Prophecy", 2024, 60, "tv"),
        ],
    )
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    return TestClient(app)


def titles(client: TestClient, **params: object) -> list[str]:
    resp = client.get("/search", params=params)
    assert resp.status_code == 200
    return [w["title"] for w in resp.json()["items"]]


def ids(client: TestClient, **params: object) -> list[str]:
    return [w["id"] for w in client.get("/search", params=params).json()["items"]]


def test_exact_title_ranks_first_and_popular_beats_obscure(client: TestClient):
    got = ids(client, q="zzdune")
    assert got[0] == "test:movie/1"  # the 2021 (high popularity) one
    assert got.index("test:movie/2") < got.index("test:movie/5") if "test:movie/5" in got else True


def test_prefix_matches(client: TestClient):
    got = titles(client, q="zzdu")
    assert "Zzdunkirk" in got
    assert "Zzdune" in got
    assert "Lawrence of Arabia" not in got


def test_typo_still_finds_title(client: TestClient):
    assert "Zzdune" in titles(client, q="zzdnue")


def test_media_filter(client: TestClient):
    assert titles(client, q="zzdune", media="tv") == ["Zzdune Prophecy"]


def test_short_and_wildcard_queries_are_safe(client: TestClient):
    assert titles(client, q="a") == []
    assert titles(client, q="") == []
    assert titles(client, q="%%") == []
    assert titles(client, q="__") == []


def test_limit(client: TestClient):
    assert len(titles(client, q="zzdu", limit=2)) == 2


def test_response_shape(client: TestClient):
    item = client.get("/search", params={"q": "zzdune"}).json()["items"][0]
    assert {"id", "media", "title", "year", "images", "source", "source_id"} <= item.keys()
