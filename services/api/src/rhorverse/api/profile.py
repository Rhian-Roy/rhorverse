from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection

from rhorverse.db import get_conn
from rhorverse.repo import ensure_profile, parse_profile_id
from rhorverse.schemas import EventAck, EventIn, TasteProfile

router = APIRouter(tags=["profile"])


def require_profile_id(raw: str) -> UUID:
    pid = parse_profile_id(raw)
    if pid is None:
        raise HTTPException(status_code=422, detail=f"profile_id must be a UUID: {raw!r}")
    return pid


@router.post("/events", response_model=EventAck, status_code=202)
def post_events(events: list[EventIn], conn: Connection = Depends(get_conn)) -> EventAck:  # noqa: B008
    """Store events for anonymous profiles (created on first sight). Unknown work ids are skipped."""
    rows = [(require_profile_id(e.profile_id), e.work_id, e.kind, e.weight) for e in events]
    accepted = 0
    with conn.transaction():
        for pid in {r[0] for r in rows}:
            ensure_profile(conn, pid)
        for pid, work_id, kind, weight in rows:
            cur = conn.execute(
                "insert into events (profile_id, work_id, kind, weight) "
                "select %s, id, %s, %s from works where id = %s",
                (pid, kind, weight, work_id),
            )
            accepted += cur.rowcount
    return EventAck(accepted=accepted)


@router.get("/profile", response_model=TasteProfile)
def get_profile(profile_id: str) -> TasteProfile:
    return TasteProfile(profile_id=profile_id)
