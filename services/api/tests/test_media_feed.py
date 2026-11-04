"""Media tab feeds against a real Postgres inside a rolled-back transaction (skipped if unreachable).

Each test clears games from the transaction and builds its own, so real catalogue rows (and a
later RAWG ingest) don't affect the assertions.
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
from rhorverse.rec.tabs import build_media
from rhorverse.rec.vec import to_pgvector

LIKED = ["test:game/g0", "test:game/g1", "test:game/g2"]
CONSUMED = "test:game/g3"


def vec(i: int) -> np.ndarray:
    v = np.zeros(DIM, dtype=np.float32)
    v[0], v[1 + i % 50] = 1.0, 0.3
    return v / np.linalg.norm(v)


@pytest.fixture
def games(conn: psycopg.Connection) -> psycopg.Connection:
    conn.execute("delete from works where media = 'game'")
    rows = [
        WorkRow(
            media="game",  # type: ignore[arg-type]
            source="test",
            source_id=f"game/g{i}",
            title=f"Game {i}",
            year=2000 + i,
            popularity=float(100 - i),
            extra={"genres": ["Action"] if i < 50 else ["Puzzle"]},
        )
        for i in range(80)  # enough that popular + new (20 each) don't starve the genre rails
    ]
    upsert_works(conn, rows)
    for i in range(80):
        conn.execute(
            "update works set embedding = %s::vector where id = %s", (to_pgvector(vec(i)), f"test:game/g{i}")
        )
    return conn


def profile(conn: psycopg.Connection) -> str:
    pid = str(uuid.uuid4())
    conn.execute("insert into profiles (id) values (%s)", (pid,))
    for wid in LIKED:
        conn.execute("insert into events (profile_id, work_id, kind) values (%s, %s, 'like')", (pid, wid))
    conn.execute(
        "insert into events (profile_id, work_id, kind) values (%s, %s, 'consumed')", (pid, CONSUMED)
    )
    return pid


def test_cold_tab_has_popular_new_and_genre_rails(games: psycopg.Connection) -> None:
    rails = build_media(games, "game", None)
    assert [r.id for r in rails][:2] == ["game-popular", "game-new"]
    assert {r.title for r in rails} >= {"Popular games", "New releases", "Action", "Puzzle"}
    assert all(r.variant == "capsule" for r in rails)
    assert all(w.media == "game" for r in rails for w in r.items)


def test_new_releases_are_newest_first(games: psycopg.Connection) -> None:
    new = next(r for r in build_media(games, "game", None) if r.id == "game-new")
    years = [w.year for w in new.items]
    assert years == sorted(years, reverse=True)


def test_genre_rails_only_hold_that_genre(games: psycopg.Connection) -> None:
    rails = {r.title: r for r in build_media(games, "game", None)}
    puzzle_ids = {f"test:game/g{i}" for i in range(50, 80)}
    assert {w.id for w in rails["Puzzle"].items} <= puzzle_ids


def test_no_item_repeats_across_rails(games: psycopg.Connection) -> None:
    ids = [w.id for r in build_media(games, "game", profile(games)) for w in r.items]
    assert len(ids) == len(set(ids))


def test_profile_gets_personal_rail_without_liked_or_consumed(games: psycopg.Connection) -> None:
    rails = build_media(games, "game", profile(games))
    assert rails[0].id == "game-for-you"
    shown = {w.id for r in rails for w in r.items}
    assert not shown & {*LIKED, CONSUMED}


def test_empty_medium_has_no_rails(conn: psycopg.Connection) -> None:
    conn.execute("delete from works where media = 'game'")
    assert build_media(conn, "game", None) == []


def test_route_and_unknown_media(games: psycopg.Connection) -> None:
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: games
    client = TestClient(app)
    body = client.get("/recs/media/game").json()
    assert body[0]["id"] == "game-popular"
    assert client.get("/recs/media/podcast").status_code == 422
