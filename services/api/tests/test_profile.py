"""The Profile summary against a real Postgres inside a rolled-back transaction (skipped if unreachable)."""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.db import get_conn
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.main import create_app
from rhorverse.rec.taste import ranked_tags


@dataclass
class S:
    kind: str
    tags: list[str]
    media: str = "movie"
    title: str = "T"
    weight: float = 1.0
    ts: datetime = field(default_factory=lambda: datetime.now(UTC))


def test_tags_rank_by_kind_and_recency():
    tags = ranked_tags(
        [
            S("like", ["drama"], title="Fresh"),
            S("like", ["old"], ts=datetime.now(UTC) - timedelta(days=360)),
            S("view", ["glance"]),
        ]
    )
    # A year-old like has decayed below a fresh view: 1.0 * 0.5^4 = 0.0625 against 0.1.
    assert [t.tag for t in tags] == ["drama", "glance", "old"]
    assert tags[0].weight == 1.0
    assert all(0 < t.weight <= 1 for t in tags)


def test_disliked_tags_count_against_a_tag():
    tags = ranked_tags([S("like", ["drama"]), S("dislike", ["drama", "gore"])])
    assert {t.tag for t in tags} == {"drama"}


def test_examples_keep_the_strongest_title_per_medium():
    tags = ranked_tags(
        [
            S("view", ["space"], title="Weak", media="movie"),
            S("like", ["space"], title="Strong", media="movie"),
            S("like", ["space"], title="An Anime", media="anime"),
        ]
    )
    assert tags[0].examples == {"movie": "Strong", "anime": "An Anime"}


def test_no_signal_means_no_tags():
    assert ranked_tags([]) == []


@pytest.fixture
def client(conn: psycopg.Connection) -> TestClient:
    upsert_works(
        conn,
        [
            WorkRow(media="movie", source="test", source_id="movie/p1", title="Liked Film", tags=["drama"]),  # type: ignore[arg-type]
            WorkRow(media="anime", source="test", source_id="anime/p2", title="Seen Anime", tags=["drama"]),  # type: ignore[arg-type]
            WorkRow(media="tv", source="test", source_id="tv/p3", title="Rejected Show", tags=["gore"]),  # type: ignore[arg-type]
        ],
    )
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    return TestClient(app)


@pytest.fixture
def pid(conn: psycopg.Connection) -> str:
    p = str(uuid.uuid4())
    conn.execute("insert into profiles (id) values (%s)", (p,))
    for wid, kind, source in [
        ("test:movie/p1", "like", "app"),
        ("test:anime/p2", "consumed", "letterboxd"),
        ("test:tv/p3", "dislike", "app"),
    ]:
        conn.execute(
            "insert into events (profile_id, work_id, kind, source) values (%s, %s, %s, %s)",
            (p, wid, kind, source),
        )
    return p


def test_profile_route_summarises_a_real_profile(client: TestClient, pid: str) -> None:
    body = client.get("/profile", params={"profile_id": pid}).json()
    assert body["top_tags"][0]["tag"] == "drama"
    assert body["top_tags"][0]["examples"] == {"movie": "Liked Film", "anime": "Seen Anime"}
    assert body["counts"] == {"anime": 1}
    assert body["sources"] == {"app": 2, "letterboxd": 1}
    assert [w["title"] for w in body["not_interested"]] == ["Rejected Show"]


def test_new_or_malformed_profile_is_empty_not_an_error(client: TestClient) -> None:
    for p in (str(uuid.uuid4()), "not-a-uuid"):
        body = client.get("/profile", params={"profile_id": p}).json()
        assert (body["top_tags"], body["counts"], body["not_interested"]) == ([], {}, [])


def test_export_downloads_every_event(client: TestClient, pid: str) -> None:
    resp = client.get("/profile/export", params={"profile_id": pid})
    assert "attachment" in resp.headers["content-disposition"]
    body = resp.json()
    assert body["profile_id"] == pid
    assert {e["title"] for e in body["events"]} == {"Liked Film", "Seen Anime", "Rejected Show"}
