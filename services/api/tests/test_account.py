"""Signed-in callers against a real Postgres inside a rolled-back transaction (skipped if unreachable).

Covers: tokens at the HTTP edge, a client-sent profile_id being ignored, the exclusion rule using the
account's own history, guest merge, and account deletion.
"""

from types import SimpleNamespace
from uuid import UUID, uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse import auth
from rhorverse.account import account_profile_id, merge_guest
from rhorverse.api.identity import effective_profile_id
from rhorverse.auth import Claims
from rhorverse.db import get_conn
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.main import create_app
from rhorverse.rec.exclude import excluded_ids
from rhorverse.rec.feed import HOME_EXCLUDING, load_signals
from tests.auth_helpers import ISSUER, Signer

WORKS = ["acct/a", "acct/b", "acct/c"]


@pytest.fixture
def signer(monkeypatch: pytest.MonkeyPatch) -> Signer:
    s = Signer.new()
    cache = s.cache()
    project_url = ISSUER.removesuffix("/auth/v1")
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(supabase_url=project_url))
    monkeypatch.setattr(auth, "default_jwks", lambda: cache)
    return s


@pytest.fixture(autouse=True)
def _works(conn: psycopg.Connection) -> None:
    upsert_works(conn, [WorkRow(media="movie", source="test", source_id=w, title=w) for w in WORKS])  # type: ignore[arg-type]


@pytest.fixture
def client(conn: psycopg.Connection) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    return TestClient(app)


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def work(i: int) -> str:
    return f"test:{WORKS[i]}"


def add_user(conn: psycopg.Connection, sub: UUID | None = None) -> Claims:
    """A user that exists in auth.users, as a real signed-in user does."""
    sub = sub or uuid4()
    conn.execute("insert into auth.users (id) values (%s) on conflict do nothing", (sub,))
    return Claims(sub=sub)


def add_event(conn: psycopg.Connection, pid: UUID, i: int, kind: str) -> None:
    conn.execute("insert into profiles (id) values (%s) on conflict do nothing", (pid,))
    conn.execute("insert into events (profile_id, work_id, kind) values (%s, %s, %s)", (pid, work(i), kind))


def count(conn: psycopg.Connection, table: str, pid: UUID) -> int:
    col = "id" if table == "profiles" else "profile_id"
    row = conn.execute(f"select count(*) as n from {table} where {col} = %s", (pid,)).fetchone()
    assert row is not None
    return int(row["n"])


# --- tokens at the HTTP edge -------------------------------------------------------------------


def test_valid_token_is_accepted_and_creates_the_profile(client, conn, signer: Signer) -> None:
    sub = add_user(conn).sub
    resp = client.get("/account/me", headers=bearer(signer.token(sub)))
    assert resp.status_code == 200
    row = conn.execute("select id from profiles where user_id = %s", (sub,)).fetchone()
    assert resp.json()["profile_id"] == str(row["id"])


@pytest.mark.parametrize(
    "token_kwargs", [{"expires_in": -5}, {"issuer": "https://evil.example/auth/v1"}, {"audience": "anon"}]
)
def test_bad_tokens_are_401_not_guest(client, signer: Signer, token_kwargs: dict) -> None:
    headers = bearer(signer.token(**token_kwargs))
    assert client.get("/account/me", headers=headers).status_code == 401
    # Also on a route guests may use: a broken token never silently downgrades to a guest.
    assert client.get("/profile", headers=headers).status_code == 401
    assert client.post("/events", json=[], headers=headers).status_code == 401


def test_account_routes_need_a_token(client) -> None:
    assert client.get("/account/me").status_code == 401
    assert client.delete("/account").status_code == 401
    assert client.post("/account/merge", json={"guest_profile_id": str(uuid4())}).status_code == 401


def test_a_deleted_users_token_cannot_bring_the_profile_back(client, conn, signer: Signer) -> None:
    ghost = uuid4()  # a valid token for a user that is not in auth.users any more
    headers = bearer(signer.token(ghost))
    assert client.get("/account/me", headers=headers).status_code == 401
    assert (
        client.post("/events", json=[{"work_id": work(0), "kind": "like"}], headers=headers).status_code
        == 401
    )


def test_no_supabase_url_means_503_for_a_token(client, signer: Signer, monkeypatch) -> None:
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(supabase_url=None))
    assert client.get("/account/me", headers=bearer(signer.token())).status_code == 503


# --- a client-sent profile_id is never trusted when a token is present -----------------------------


def test_events_go_to_the_token_profile_not_the_one_the_client_names(client, conn, signer: Signer) -> None:
    sub, victim = add_user(conn).sub, uuid4()
    conn.execute("insert into profiles (id) values (%s)", (victim,))
    body = [{"profile_id": str(victim), "work_id": work(0), "kind": "consumed"}]
    assert client.post("/events", json=body, headers=bearer(signer.token(sub))).json() == {"accepted": 1}
    mine = account_profile_id(conn, Claims(sub=sub))
    assert count(conn, "events", mine) == 1
    assert count(conn, "events", victim) == 0


def test_guests_still_work_with_the_cookie_id(client) -> None:
    guest = uuid4()
    body = [{"profile_id": str(guest), "work_id": work(0), "kind": "like"}]
    assert client.post("/events", json=body).json() == {"accepted": 1}
    assert client.post("/events", json=[{"work_id": work(0), "kind": "like"}]).status_code == 422
    assert client.get("/profile", params={"profile_id": str(guest)}).json()["profile_id"] == str(guest)


def test_profile_and_export_use_the_token_profile(client, conn, signer: Signer) -> None:
    sub, other = add_user(conn).sub, uuid4()
    add_event(conn, other, 1, "dislike")
    mine = account_profile_id(conn, Claims(sub=sub))
    add_event(conn, mine, 0, "consumed")
    headers = bearer(signer.token(sub))
    got = client.get("/profile", params={"profile_id": str(other)}, headers=headers).json()
    assert got["profile_id"] == str(mine)
    export = client.get("/profile/export", params={"profile_id": str(other)}, headers=headers).json()
    assert export["profile_id"] == str(mine)
    assert [e["work_id"] for e in export["events"]] == [work(0)]
    assert export["account"]["email"] == "someone@example.test"


# --- the exclusion rule for signed-in users ------------------------------------------------------------


def test_exclusion_uses_the_account_history_even_if_the_client_names_another_profile(conn) -> None:
    other = uuid4()
    claims = add_user(conn)
    mine = account_profile_id(conn, claims)
    add_event(conn, mine, 0, "consumed")  # seen it: must be excluded
    add_event(conn, mine, 1, "dislike")  # not interested: must be excluded
    add_event(conn, other, 2, "consumed")  # someone else's history: must not leak in

    pid = effective_profile_id(profile_id=str(other), claims=claims, conn=conn)
    assert pid == str(mine)
    excluded = excluded_ids(((s.work_id, s.kind) for s in load_signals(conn, pid)), HOME_EXCLUDING)
    assert excluded == {work(0), work(1)}

    # A guest (no token) is judged by the id they send, as before.
    guest_pid = effective_profile_id(profile_id=str(other), claims=None, conn=conn)
    excluded = excluded_ids(((s.work_id, s.kind) for s in load_signals(conn, guest_pid)), HOME_EXCLUDING)
    assert excluded == {work(2)}


def test_consent_comes_from_signup_metadata_with_a_server_timestamp(conn) -> None:
    yes, no = add_user(conn), add_user(conn)
    meta = {"age_confirmed": True, "privacy_consent": True, "consent_at": "1999-01-01T00:00:00Z"}
    pid_yes = account_profile_id(conn, Claims(sub=yes.sub, user_metadata=meta))
    pid_no = account_profile_id(conn, Claims(sub=no.sub, user_metadata={"age_confirmed": True}))
    row = conn.execute("select age_confirmed, consent_at from profiles where id = %s", (pid_yes,)).fetchone()
    assert row["age_confirmed"] and row["consent_at"].year >= 2025  # the client's timestamp is ignored
    row = conn.execute("select age_confirmed, consent_at from profiles where id = %s", (pid_no,)).fetchone()
    assert not row["age_confirmed"] and row["consent_at"] is None
    assert account_profile_id(conn, yes) == pid_yes  # a second call finds the same profile


# --- guest merge --------------------------------------------------------------------------------------------


def test_merge_moves_guest_data_once_and_dedupes(client, conn, signer: Signer) -> None:
    sub, guest = add_user(conn).sub, uuid4()
    mine = account_profile_id(conn, Claims(sub=sub))
    add_event(conn, mine, 0, "consumed")  # already in the account
    add_event(conn, guest, 0, "consumed")  # duplicate of it: not copied
    add_event(conn, guest, 1, "consumed")
    add_event(conn, guest, 1, "consumed")  # duplicate inside the guest: copied once
    add_event(conn, guest, 2, "save")
    conn.execute(
        "insert into imports (profile_id, source, status) values (%s, 'letterboxd', 'done')", (guest,)
    )

    headers = bearer(signer.token(sub))
    resp = client.post("/account/merge", json={"guest_profile_id": str(guest)}, headers=headers)
    assert resp.json() == {"events": 2, "saved": 1, "imports": 1}
    got = conn.execute(
        "select work_id, kind from events where profile_id = %s order by 1", (mine,)
    ).fetchall()
    assert [(r["work_id"], r["kind"]) for r in got] == [
        (work(0), "consumed"),
        (work(1), "consumed"),
        (work(2), "save"),
    ]
    assert count(conn, "imports", mine) == 1
    assert count(conn, "profiles", guest) == 0

    # Calling it again (a second tab, a retry) is harmless.
    again = client.post("/account/merge", json={"guest_profile_id": str(guest)}, headers=headers)
    assert again.json() == {"events": 0, "saved": 0, "imports": 0}


def test_merge_will_not_take_another_accounts_profile(conn) -> None:
    mine = account_profile_id(conn, add_user(conn))
    theirs = account_profile_id(conn, add_user(conn))
    add_event(conn, theirs, 0, "consumed")
    assert merge_guest(conn, mine, theirs).events == 0
    assert count(conn, "events", theirs) == 1


def test_merge_into_itself_is_a_no_op(conn) -> None:
    mine = account_profile_id(conn, add_user(conn))
    add_event(conn, mine, 0, "consumed")
    assert merge_guest(conn, mine, mine).events == 0
    assert count(conn, "events", mine) == 1


# --- delete ------------------------------------------------------------------------------------------------


def test_delete_removes_only_the_callers_data(client, conn, signer: Signer) -> None:
    sub = add_user(conn).sub
    mine = account_profile_id(conn, Claims(sub=sub))
    add_event(conn, mine, 0, "consumed")
    conn.execute("insert into imports (profile_id, source) values (%s, 'letterboxd')", (mine,))
    theirs = account_profile_id(conn, add_user(conn))
    add_event(conn, theirs, 1, "consumed")

    assert client.delete("/account", headers=bearer(signer.token(sub))).status_code == 204
    for table in ("profiles", "events", "imports"):
        assert count(conn, table, mine) == 0
    assert count(conn, "events", theirs) == 1
