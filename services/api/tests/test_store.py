"""Upsert helpers against a real Postgres, inside a transaction that is always rolled back."""

import psycopg

from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import (
    AvailabilityItem,
    add_links,
    replace_availability,
    upsert_works,
)


def row(**kw: object) -> WorkRow:
    base: dict[str, object] = {
        "media": "movie",
        "source": "test",
        "source_id": "movie/1",
        "title": "Test Film",
        "year": 2001,
        "overview": "A test.",
        "tags": ["drama"],
    }
    return WorkRow(**{**base, **kw})  # type: ignore[arg-type]


def count(conn: psycopg.Connection) -> int:
    return conn.execute("select count(*) as n from works where source = 'test'").fetchone()["n"]


def test_upsert_is_idempotent(conn: psycopg.Connection) -> None:
    assert upsert_works(conn, [row()]) == 1
    upsert_works(conn, [row(title="Renamed")])
    assert count(conn) == 1
    title = conn.execute("select title from works where id = 'test:movie/1'").fetchone()["title"]
    assert title == "Renamed"


def test_embedding_kept_unless_vibe_text_changes(conn: psycopg.Connection) -> None:
    upsert_works(conn, [row()])
    conn.execute(
        "update works set embedding = array_fill(0.1::real, array[384])::vector where id = 'test:movie/1'"
    )
    upsert_works(conn, [row()])
    kept = conn.execute("select embedding is not null as ok from works where id = 'test:movie/1'").fetchone()[
        "ok"
    ]
    assert kept
    upsert_works(conn, [row(overview="A different overview.")])
    gone = conn.execute("select embedding is null as ok from works where id = 'test:movie/1'").fetchone()[
        "ok"
    ]
    assert gone


def test_availability_is_replaced(conn: psycopg.Connection) -> None:
    upsert_works(conn, [row()])
    wid = "test:movie/1"
    replace_availability(conn, wid, "IN", [AvailabilityItem("Netflix", "flatrate")])
    replace_availability(conn, wid, "IN", [AvailabilityItem("Prime Video", "rent")])
    rows = conn.execute("select provider from availability where work_id = %s", (wid,)).fetchall()
    assert [r["provider"] for r in rows] == ["Prime Video"]


def test_links_are_deduplicated(conn: psycopg.Connection) -> None:
    upsert_works(conn, [row()])
    add_links(conn, "test:movie/1", [("imdb", "tt1")])
    add_links(conn, "test:movie/1", [("imdb", "tt1")])
    n = conn.execute("select count(*) as n from work_links where work_id = 'test:movie/1'").fetchone()["n"]
    assert n == 1
