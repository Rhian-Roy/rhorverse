from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection

from rhorverse.db import get_conn
from rhorverse.schemas import EventAck, EventIn, TasteProfile

router = APIRouter(tags=["profile"])


def _profile_uuid(raw: str) -> UUID:
    try:
        return UUID(raw)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"profile_id must be a UUID: {raw!r}") from e


@router.post("/events", response_model=EventAck, status_code=202)
def post_events(events: list[EventIn], conn: Connection = Depends(get_conn)) -> EventAck:  # noqa: B008
    """Store events for anonymous profiles (created on first sight). Unknown work ids are skipped."""
    rows = [(_profile_uuid(e.profile_id), e.work_id, e.kind, e.weight) for e in events]
    accepted = 0
    with conn.transaction():
        for pid in {r[0] for r in rows}:
            conn.execute("insert into profiles (id) values (%s) on conflict (id) do nothing", (pid,))
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
