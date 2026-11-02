"""POST /events against a real Postgres inside a rolled-back transaction (skipped if unreachable)."""

import uuid

import psycopg
import pytest
from fastapi.testclient import TestClient

from rhorverse.db import get_conn
from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.main import create_app


@pytest.fixture
def client(conn: psycopg.Connection) -> TestClient:
    upsert_works(conn, [WorkRow(media="movie", source="test", source_id="movie/ev1", title="Liked")])  # type: ignore[arg-type]
    app = create_app()
    app.dependency_overrides[get_conn] = lambda: conn
    return TestClient(app)


def test_events_are_stored_and_profile_created(client: TestClient, conn: psycopg.Connection) -> None:
    pid = str(uuid.uuid4())
    body = [{"profile_id": pid, "work_id": "test:movie/ev1", "kind": "like"}]
    resp = client.post("/events", json=body)
    assert resp.status_code == 202
    assert resp.json() == {"accepted": 1}
    kinds = conn.execute("select kind from events where profile_id = %s", (pid,)).fetchall()
    assert [k["kind"] for k in kinds] == ["like"]
    assert conn.execute("select 1 from profiles where id = %s", (pid,)).fetchone()


def test_unknown_work_is_skipped(client: TestClient) -> None:
    pid = str(uuid.uuid4())
    body = [
        {"profile_id": pid, "work_id": "test:movie/ev1", "kind": "like"},
        {"profile_id": pid, "work_id": "test:nope", "kind": "like"},
    ]
    assert client.post("/events", json=body).json() == {"accepted": 1}


def test_bad_profile_id_is_422(client: TestClient) -> None:
    body = [{"profile_id": "not-a-uuid", "work_id": "test:movie/ev1", "kind": "like"}]
    assert client.post("/events", json=body).status_code == 422
