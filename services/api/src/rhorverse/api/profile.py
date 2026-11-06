from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from psycopg import Connection

from rhorverse.account import account_profile_id, account_summary, export_imports
from rhorverse.api.identity import bearer_claims, effective_profile_id
from rhorverse.auth import Claims
from rhorverse.db import get_conn
from rhorverse.rec.taste import build_profile, export_events
from rhorverse.repo import ensure_profile, parse_profile_id
from rhorverse.schemas import EventAck, EventIn, TasteProfile

router = APIRouter(tags=["profile"])


def require_profile_id(raw: str | None) -> UUID:
    pid = parse_profile_id(raw)
    if pid is None:
        raise HTTPException(status_code=422, detail=f"profile_id must be a UUID: {raw!r}")
    return pid


def _required(profile_id: str | None) -> str:
    if profile_id is None:
        raise HTTPException(status_code=422, detail="profile_id is required")
    return profile_id


@router.post("/events", response_model=EventAck, status_code=202)
def post_events(
    events: list[EventIn],
    claims: Claims | None = Depends(bearer_claims),  # noqa: B008
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> EventAck:
    """Store events. Signed in: always for the token's own profile. Guests: for the profile id they send
    (created on first sight). Unknown work ids are skipped."""
    own = account_profile_id(conn, claims) if claims is not None else None
    rows = [(own or require_profile_id(e.profile_id), e.work_id, e.kind, e.weight) for e in events]
    accepted = 0
    with conn.transaction():
        for pid in {r[0] for r in rows} - {own}:
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
def get_profile(
    profile_id: str | None = Depends(effective_profile_id),
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> TasteProfile:
    """Ranked taste tags, seen counts, sources and the not-interested list. Empty for a new profile."""
    return build_profile(conn, _required(profile_id))


@router.get("/profile/export")
def export_profile(
    profile_id: str | None = Depends(effective_profile_id),
    claims: Claims | None = Depends(bearer_claims),  # noqa: B008
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> JSONResponse:
    """Everything stored for this profile (account details when signed in, events, imports), as a file."""
    raw = _required(profile_id)
    pid = parse_profile_id(raw)
    return JSONResponse(
        {
            "profile_id": raw,
            "account": {"email": claims.email, **account_summary(conn, pid)} if claims and pid else None,
            "events": export_events(conn, raw),
            "imports": export_imports(conn, pid) if pid else [],
        },
        headers={"Content-Disposition": 'attachment; filename="rhorverse-profile.json"'},
    )
