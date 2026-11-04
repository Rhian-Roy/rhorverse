"""Home feed against a real Postgres inside a rolled-back transaction (skipped if unreachable).

Real catalogue embeddings are nulled inside the transaction so only the hand-made test vectors
take part in ANN; the real rows still show up in the popular rails.
"""

import uuid

import numpy as np
import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.db import get_conn
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.main import create_app
from rhorverse.rec.embed import DIM
from rhorverse.rec.feed import Candidate, build_home, rank_rail
from rhorverse.rec.vec import to_pgvector

LIKED = ["test:movie/a0", "test:movie/a1", "test:tv/b0"]
CONSUMED = "test:movie/a2"


def unit(axis: int, wobble: int) -> np.ndarray:
    v = np.zeros(DIM, dtype=np.float32)
    v[axis] = 1.0
    v[10 + wobble] = 0.3
    return v / np.linalg.norm(v)


@pytest.fixture
def pid(conn: psycopg.Connection) -> str:
    conn.execute("update works set embedding = null where source <> 'test'")
    rows, vectors = [], {}
    for i in range(24):  # two taste clusters: space movies (axis 0), cosy tv (axis 1)
        for media, prefix, axis, tags in (("movie", "a", 0, ["space"]), ("tv", "b", 1, ["cozy"])):
            sid = f"{media}/{prefix}{i}"
            rows.append(
                WorkRow(
                    media=media,  # type: ignore[arg-type]
                    source="test",
                    source_id=sid,
                    title=f"T {prefix}{i}",
                    year=2000 + i,
                    tags=tags,
                    popularity=float(i),
                    images={"backdrop": f"https://example.test/{sid}.jpg"},
                )
            )
            vectors[f"test:{sid}"] = unit(axis, i)
    upsert_works(conn, rows)
    for wid, v in vectors.items():
        conn.execute("update works set embedding = %s::vector where id = %s", (to_pgvector(v), wid))

    profile = str(uuid.uuid4())
    conn.execute("insert into profiles (id) values (%s)", (profile,))
    for wid in LIKED:
        conn.execute("insert into events (profile_id, work_id, kind) values (%s, %s, 'like')", (profile, wid))
    conn.execute(
        "insert into events (profile_id, work_id, kind) values (%s, %s, 'consumed')", (profile, CONSUMED)
    )
    return profile


def all_ids(feed) -> set[str]:
    return {w.id for r in feed.rails for w in r.items} | {w.id for w in feed.hero}


def test_cold_start_has_popular_rails(conn: psycopg.Connection, pid: str) -> None:
    feed = build_home(conn, None)
    assert {r.id for r in feed.rails} >= {"popular-movie", "popular-tv"}
    assert feed.hero


def test_cold_start_has_popular_anime_when_anime_exists(conn: psycopg.Connection, pid: str) -> None:
    upsert_works(conn, [WorkRow(media="anime", source="test", source_id="anime/x1", title="T x1")])  # type: ignore[arg-type]
    rails = {r.id: r for r in build_home(conn, None).rails}
    assert "popular-anime" in rails
    assert all(w.media == "anime" for w in rails["popular-anime"].items)


def test_cold_start_has_popular_games_as_capsules(conn: psycopg.Connection, pid: str) -> None:
    upsert_works(conn, [WorkRow(media="game", source="test", source_id="game/g1", title="T g1")])  # type: ignore[arg-type]
    rails = {r.id: r for r in build_home(conn, None).rails}
    assert rails["popular-game"].variant == "capsule"
    assert all(w.media == "game" for w in rails["popular-game"].items)


def test_cold_start_has_popular_music_as_squares(conn: psycopg.Connection, pid: str) -> None:
    upsert_works(conn, [WorkRow(media="music", source="test", source_id="album/m1", title="T m1")])  # type: ignore[arg-type]
    rails = {r.id: r for r in build_home(conn, None).rails}
    assert rails["popular-music"].variant == "square"
    assert all(w.media == "music" for w in rails["popular-music"].items)


def test_three_likes_give_personal_rails_without_consumed_or_liked(
    conn: psycopg.Connection, pid: str
) -> None:
    feed = build_home(conn, pid)
    assert len(feed.rails) >= 3
    assert feed.rails[0].id == "for-you"
    assert any(r.explanation for r in feed.rails)
    assert not all_ids(feed) & {*LIKED, CONSUMED}


def test_rails_do_not_repeat_items(conn: psycopg.Connection, pid: str) -> None:
    ids = [w.id for r in build_home(conn, pid).rails for w in r.items]
    assert len(ids) == len(set(ids))


def test_malformed_profile_is_cold_start(conn: psycopg.Connection, pid: str) -> None:
    assert build_home(conn, "not-a-uuid").rails[0].id == "popular-movie"


def test_routes(conn: psycopg.Connection, pid: str) -> None:
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    client = TestClient(app)
    home = client.get("/recs/home", params={"profile_id": pid}).json()
    assert len(home["rails"]) >= 3
    rail = client.get("/recs/because/test:movie/a0", params={"profile_id": pid}).json()
    assert rail["explanation"]["because_title"] == "T a0"
    assert rail["items"]
    assert not {w["id"] for w in rail["items"]} & {*LIKED, CONSUMED}
    assert client.get("/recs/because/test:nope").status_code == 404


def test_rank_rail_diversifies_near_duplicates() -> None:
    def cand(wid: str, emb: list[float], sim: float) -> Candidate:
        row = {"id": wid, "year": 2020, "popularity": 1.0, "tags": []}
        return Candidate(row, np.array(emb) / np.linalg.norm(emb), sim)

    cands = [cand("a", [1, 0], 0.99), cand("a-dup", [1, 0], 0.98), cand("b", [0, 1], 0.9)]
    assert [c.id for c in rank_rail(cands, k=2, lam=0.5)] == ["a", "b"]
