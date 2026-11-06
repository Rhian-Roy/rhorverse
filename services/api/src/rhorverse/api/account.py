from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from psycopg import Connection

from rhorverse.account import (
    account_summary,
    delete_account_data,
    merge_guest,
    record_consent,
)
from rhorverse.api.identity import own_profile_id, require_claims
from rhorverse.auth import Claims
from rhorverse.db import get_conn
from rhorverse.repo import parse_profile_id
from rhorverse.schemas import AccountInfo, MergeIn, MergeOut

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me", response_model=AccountInfo)
def me(claims: Claims = Depends(require_claims), conn: Connection = Depends(get_conn)) -> AccountInfo:  # noqa: B008
    pid = own_profile_id(conn, claims)
    return AccountInfo(profile_id=str(pid), email=claims.email, **account_summary(conn, pid))


@router.post("/consent", response_model=AccountInfo)
def consent(claims: Claims = Depends(require_claims), conn: Connection = Depends(get_conn)) -> AccountInfo:  # noqa: B008
    """Record the 18+ and privacy confirmation for users who signed up without the form (Google)."""
    pid = own_profile_id(conn, claims)
    record_consent(conn, pid)
    return AccountInfo(profile_id=str(pid), email=claims.email, **account_summary(conn, pid))


@router.post("/merge", response_model=MergeOut)
def merge(
    body: MergeIn,
    claims: Claims = Depends(require_claims),  # noqa: B008
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> MergeOut:
    """Fold the caller's guest profile into their account. Safe to repeat: the second call moves nothing."""
    guest: UUID | None = parse_profile_id(body.guest_profile_id)
    if guest is None:
        raise HTTPException(status_code=422, detail="guest_profile_id must be a UUID")
    with conn.transaction():
        result = merge_guest(conn, own_profile_id(conn, claims), guest)
    return MergeOut(events=result.events, saved=result.saved, imports=result.imports)


@router.delete("", status_code=204)
def delete(claims: Claims = Depends(require_claims), conn: Connection = Depends(get_conn)) -> Response:  # noqa: B008
    """Remove the caller's profile, events and imports. The web app then deletes the auth user."""
    delete_account_data(conn, claims.sub)
    return Response(status_code=204)
