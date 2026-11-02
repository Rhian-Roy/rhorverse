"""Letterboxd import against a real Postgres (rolled back), with a fake TMDB (skipped if DB is down)."""

import uuid
from pathlib import Path

import httpx
import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.api.imports import tmdb_http
from rhorverse.db import get_conn
from rhorverse.ingest.http import Http
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.main import create_app
from rhorverse.rec.feed import build_home

FIXTURES = Path(__file__).parent / "fixtures" / "letterboxd"
WATCHED = (FIXTURES / "watched.csv").read_bytes()
RATINGS = (FIXTURES / "ratings.csv").read_bytes()

# Catalogue spellings differ from Letterboxd's on purpose (accents, articles, year ±1).
CATALOGUE = [
    ("m1", "The Matrix", 1999),
    ("m2", "Amelie", 2001),
    ("m3", "Spirited Away", 2002),
    ("m4", "Parasite", 2019),
    ("m5", "Crouching Tiger, Hidden Dragon", 2000),
    ("m6", "Dune: Part Two", 2024),
    ("m7", "Se7en", 1995),
    ("m8", "Heat", 1995),
    ("m9", "Arrival", 2016),
    ("m10", "Paddington 2", 2017),
]

# What fake TMDB knows that the catalogue doesn't.
STUDENT_FILM = {
    "id": 777,
    "title": "Totally Unknown Student Film",
    "release_date": "2011-05-01",
    "genres": [],
    "popularity": 0.1,
}


def fake_tmdb(tmp_path: Path, knows_student_film: bool) -> Http:
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/search/movie"):
            hit = knows_student_film and "student" in request.url.params["query"].lower()
            return httpx.Response(200, json={"results": [STUDENT_FILM] if hit else []})
        if path.endswith("/movie/777"):
            return httpx.Response(200, json=STUDENT_FILM)
        return httpx.Response(404, json={})

    return Http(
        "tmdb", rate=1000, cache_root=tmp_path, client=httpx.Client(transport=httpx.MockTransport(handler))
    )


def make_client(conn: psycopg.Connection, http: Http | None) -> TestClient:
    rows = [
        WorkRow(media="movie", source="test", source_id=f"movie/{sid}", title=t, year=y, popularity=50.0)  # type: ignore[arg-type]
        for sid, t, y in CATALOGUE
    ]
    upsert_works(conn, rows)
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    app.dependency_overrides[tmdb_http] = lambda: http
    return TestClient(app)


@pytest.fixture
def pid() -> str:
    return str(uuid.uuid4())


def post(client: TestClient, pid: str, body: bytes) -> httpx.Response:
    return client.post(
        "/imports/letterboxd", params={"profile_id": pid}, content=body, headers={"content-type": "text/csv"}
    )


def test_fixture_matches_at_least_90_percent(conn: psycopg.Connection, tmp_path: Path, pid: str) -> None:
    res = post(make_client(conn, fake_tmdb(tmp_path, knows_student_film=False)), pid, WATCHED).json()
    assert res["status"] == "done"
    assert res["matched"] / (res["matched"] + res["unmatched"]) >= 0.9
    assert res["unmatched_titles"] == ["Totally Unknown Student Film"]
    row = conn.execute("select status, matched from imports where profile_id = %s", (pid,)).fetchone()
    assert (row["status"], row["matched"]) == ("done", res["matched"])


def test_missing_film_is_fetched_from_tmdb(conn: psycopg.Connection, tmp_path: Path, pid: str) -> None:
    res = post(make_client(conn, fake_tmdb(tmp_path, knows_student_film=True)), pid, WATCHED).json()
    assert (res["fetched"], res["unmatched"]) == (1, 0)
    kinds = conn.execute(
        "select kind from events where profile_id = %s and work_id = 'tmdb:movie/777'", (pid,)
    ).fetchall()
    assert [k["kind"] for k in kinds] == ["consumed"]


def test_ratings_become_like_and_dislike_and_reimport_adds_nothing(
    conn: psycopg.Connection, tmp_path: Path, pid: str
) -> None:
    client = make_client(conn, None)
    post(client, pid, RATINGS)

    def events() -> set[tuple[str, str]]:
        rows = conn.execute(
            "select work_id, kind from events where profile_id = %s and source = 'letterboxd'", (pid,)
        ).fetchall()
        return {(r["work_id"], r["kind"]) for r in rows}

    first = events()
    assert ("test:movie/m1", "like") in first  # 5 stars
    assert ("test:movie/m8", "dislike") in first  # 1 star
    assert ("test:movie/m9", "like") not in first  # 3 stars: consumed only
    post(client, pid, RATINGS)
    n = conn.execute("select count(*) as n from events where profile_id = %s", (pid,)).fetchone()["n"]
    assert n == len(first)


def test_imported_films_are_excluded_from_home(conn: psycopg.Connection, tmp_path: Path, pid: str) -> None:
    post(make_client(conn, None), pid, WATCHED)
    feed = build_home(conn, pid)
    shown = {w.id for r in feed.rails for w in r.items} | {w.id for w in feed.hero}
    assert not shown & {f"test:movie/{sid}" for sid, _, _ in CATALOGUE}


def test_bad_inputs(conn: psycopg.Connection, pid: str) -> None:
    client = make_client(conn, None)
    assert post(client, pid, b"Title,Date\nFoo,2024-01-01\n").status_code == 422
    assert post(client, "not-a-uuid", WATCHED).status_code == 422
