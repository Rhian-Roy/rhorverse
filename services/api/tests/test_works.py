"""/works against a real Postgres inside a rolled-back transaction (skipped if unreachable)."""

import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.db import get_conn
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import AvailabilityItem, replace_availability, upsert_works
from rhorverse.main import create_app


@pytest.fixture
def client(conn: psycopg.Connection) -> TestClient:
    upsert_works(
        conn,
        [
            WorkRow(
                media="movie",
                source="test",
                source_id="movie/1",
                title="Zzfilm",
                year=2020,
                overview="Hello.",
                tags=["drama"],
                images={"poster": "https://image.tmdb.org/t/p/w500/p.jpg"},
                popularity=99999,
                extra={"genres": ["Drama"], "runtime_min": ["100"]},
            ),
            WorkRow(media="tv", source="test", source_id="tv/2", title="Zzshow", popularity=99998),
        ],
    )
    replace_availability(
        conn,
        "test:movie/1",
        "IN",
        [
            AvailabilityItem("Zzrent", "rent", "https://jw/x", "l.jpg"),
            AvailabilityItem("Zzstream", "flatrate"),
        ],
    )
    replace_availability(conn, "test:movie/1", "US", [AvailabilityItem("Zzus", "flatrate")])
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    return TestClient(app)


def test_detail_with_slash_in_id(client: TestClient):
    for path in ("/works/test:movie/1", "/works/test%3Amovie%2F1"):
        resp = client.get(path)
        assert resp.status_code == 200, path
        body = resp.json()
        assert body["title"] == "Zzfilm"
        assert body["images"]["poster"].endswith("/p.jpg")
        assert body["facets"] == {"genres": ["Drama"], "runtime_min": ["100"]}


def test_availability_is_in_only_and_ordered(client: TestClient):
    names = [(p["name"], p["kind"]) for p in client.get("/works/test:movie/1").json()["availability"]]
    assert names == [("Zzstream", "flatrate"), ("Zzrent", "rent")]


def test_unknown_id_is_404(client: TestClient):
    assert client.get("/works/test:movie/does-not-exist").status_code == 404


def test_list_filters_by_media_and_orders_by_popularity(client: TestClient):
    got = [w["id"] for w in client.get("/works", params={"limit": 2}).json()]
    assert got == ["test:movie/1", "test:tv/2"]
    assert [w["id"] for w in client.get("/works", params={"media": "tv", "limit": 1}).json()] == ["test:tv/2"]
