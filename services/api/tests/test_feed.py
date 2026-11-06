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
from rhorverse.rec import explain
from rhorverse.rec.embed import DIM
from rhorverse.rec.feed import (
    MEDIA_LABEL,
    Candidate,
    build_home,
    candidates,
    popular,
    rank_rail,
    top_in_india,
)
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
    assert feed.rails[0].id == "for-you-movie"
    assert any(r.explanation for r in feed.rails)
    assert not all_ids(feed) & {*LIKED, CONSUMED}


def test_rails_do_not_repeat_items(conn: psycopg.Connection, pid: str) -> None:
    ids = [w.id for r in build_home(conn, pid).rails for w in r.items]
    assert len(ids) == len(set(ids))


def test_malformed_profile_is_cold_start(conn: psycopg.Connection, pid: str) -> None:
    assert not any(r.id.startswith("for-you") for r in build_home(conn, "not-a-uuid").rails)


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


def test_candidates_widen_hnsw_search_to_k(conn: psycopg.Connection, pid: str) -> None:
    # Regression: HNSW's default ef_search (40) silently capped k=200 at 40 candidates.
    candidates(conn, unit(0, 0), set(), k=200)
    row = conn.execute(
        "select current_setting('hnsw.ef_search') as ef, current_setting('hnsw.iterative_scan') as it"
    ).fetchone()
    assert (row["ef"], row["it"]) == ("200", "relaxed_order")


def test_candidates_media_filter(conn: psycopg.Connection, pid: str) -> None:
    got = candidates(conn, unit(0, 0), set(), media="tv")
    assert got
    assert all(c.row["media"] == "tv" for c in got)


def test_personal_hero_says_why_with_the_nearest_like(conn: psycopg.Connection, pid: str) -> None:
    hero = build_home(conn, pid).hero
    assert hero
    # Space movies (axis 0) are nearest the liked space movies; cosy TV is nearest the liked TV show.
    for w in hero:
        expected = "T b0" if w.media == "tv" else None
        assert w.why is not None and w.why.startswith("Because you liked T ")
        if expected:
            assert w.why.endswith(expected)


def test_cold_hero_shows_true_ranks_per_medium(conn: psycopg.Connection, pid: str) -> None:
    hero = build_home(conn, None).hero
    assert hero
    assert all(w.why and w.why.startswith("#") for w in hero)
    works = popular(conn, None, set(), limit=20)
    first = works[0]
    shown_as = next((w.why for w in hero if w.id == first.id), None)
    assert shown_as in (None, f"#1 most popular in {MEDIA_LABEL[first.media]}")


def test_saved_works_lead_the_feed_and_arent_repeated(conn: psycopg.Connection, pid: str) -> None:
    saved = "test:movie/a10"
    conn.execute("insert into events (profile_id, work_id, kind) values (%s, %s, 'save')", (pid, saved))
    rails = build_home(conn, pid).rails
    assert rails[0].id == "saved"
    assert [w.id for w in rails[0].items] == [saved]
    assert sum(w.id == saved for r in rails for w in r.items) == 1


def test_consumed_work_is_never_saved_rail(conn: psycopg.Connection, pid: str) -> None:
    conn.execute("insert into events (profile_id, work_id, kind) values (%s, %s, 'save')", (pid, CONSUMED))
    assert "saved" not in {r.id for r in build_home(conn, pid).rails}


def test_rails_follow_the_plan_order_for_a_profile(conn: psycopg.Connection, pid: str) -> None:
    ids = [r.id for r in build_home(conn, pid).rails]
    positions = [ids.index(i) for i in ("for-you-movie", "popular-movie") if i in ids]
    assert positions == sorted(positions)
    assert any(i.startswith("because-") for i in ids)


def test_top_10_only_has_titles_available_in_india(conn: psycopg.Connection, pid: str) -> None:
    # Enough India titles for the rail to show (4+), so this doesn't lean on whatever real data is loaded.
    in_india = [f"test:movie/a{i}" for i in (5, 7, 8, 9)]
    for wid in in_india:
        conn.execute(
            "insert into availability (work_id, region, provider, kind) values (%s, 'IN', 'P', 'flatrate')",
            (wid,),
        )
    conn.execute("update works set popularity = 99999 where id in ('test:movie/a5', 'test:movie/a6')")
    top = top_in_india(conn, set())
    assert top[0].id == "test:movie/a5"
    assert "test:movie/a6" not in {w.id for w in top}
    assert len(top) <= 10
    rail = next(r for r in build_home(conn, None).rails if r.id == "top-india")
    assert rail.ranked
    assert rail.items[0].id == "test:movie/a5"
    ids = [w.id for w in rail.items]
    on_india = conn.execute(
        "select count(distinct work_id) as n from availability where region = 'IN' and work_id = any(%s)",
        (ids,),
    ).fetchone()["n"]
    assert on_india == len(ids)


def api_client(conn: psycopg.Connection) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    return TestClient(app)


def test_why_names_the_nearest_like_and_shared_tags(conn: psycopg.Connection, pid: str) -> None:
    body = api_client(conn).get("/recs/why/test:tv/b9", params={"profile_id": pid}).json()
    assert body["because_title"] == "T b0"
    assert body["shared_tags"] == ["cozy"]
    assert body["reason"] == "Shares cozy with T b0."


def test_why_is_null_without_taste_and_404_for_unknown(conn: psycopg.Connection, pid: str) -> None:
    client = api_client(conn)
    assert client.get("/recs/why/test:tv/b9").json() is None
    assert client.get("/recs/why/test:nope").status_code == 404


def test_explanations_never_claim_data_we_dont_have() -> None:
    assert "often" not in explain.because("x", "X", []).reason


def test_across_media_only_has_other_media(conn: psycopg.Connection, pid: str) -> None:
    rail = api_client(conn).get("/recs/across/test:movie/a9").json()
    assert rail["title"] == "Across media"
    assert rail["items"]
    assert all(w["media"] != "movie" for w in rail["items"])
    assert len(rail["items"]) <= 2 * 4
    assert api_client(conn).get("/recs/across/test:nope").status_code == 404


def test_across_media_skips_what_the_profile_consumed(conn: psycopg.Connection, pid: str) -> None:
    rail = api_client(conn).get("/recs/across/test:tv/b9", params={"profile_id": pid}).json()
    assert not {w["id"] for w in rail["items"]} & {*LIKED, CONSUMED}


def test_no_why_when_nothing_truly_connects_them(conn: psycopg.Connection, pid: str) -> None:
    # Orthogonal to every liked vector, and no shared tags: there's nothing true to say.
    upsert_works(
        conn, [WorkRow(media="movie", source="test", source_id="movie/far", title="Far", tags=["x"])]
    )  # type: ignore[arg-type]
    v = np.zeros(DIM, dtype=np.float32)
    v[300] = 1.0
    conn.execute("update works set embedding = %s::vector where id = 'test:movie/far'", (to_pgvector(v),))
    assert api_client(conn).get("/recs/why/test:movie/far", params={"profile_id": pid}).json() is None


def test_album_fan_still_gets_a_personal_hero(conn: psycopg.Connection, pid: str) -> None:
    # Backdrop-less works near the taste must not push the hero back to the generic list.
    conn.execute(
        "update works set images = '{}'::jsonb "
        "where source = 'test' and id not in ('test:movie/a20', 'test:tv/b20')"
    )
    hero = build_home(conn, pid).hero
    assert hero
    assert all(w.why and w.why.startswith("Because you") for w in hero)


def test_cold_hero_takes_turns_across_media(conn: psycopg.Connection, pid: str) -> None:
    media = [w.media for w in build_home(conn, None).hero]
    assert len(set(media[:2])) == 2
