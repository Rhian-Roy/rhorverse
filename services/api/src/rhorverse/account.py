"""Account profiles: find or create the profile for a signed-in user, merge a guest, delete."""

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from psycopg import Connection, errors

from rhorverse.auth import Claims


class AccountGone(Exception):
    """The token is valid but its user no longer exists (deleted since the token was issued)."""


def account_profile_id(conn: Connection, claims: Claims) -> UUID:
    """The signed-in user's profile id, created on first sight.

    Consent comes from the sign-up form's metadata, but the timestamp is ours, not the client's.
    """
    row = conn.execute("select id from profiles where user_id = %s", (claims.sub,)).fetchone()
    if row:
        return row["id"]  # type: ignore[no-any-return]
    meta = claims.user_metadata
    consented = meta.get("age_confirmed") is True and meta.get("privacy_consent") is True
    try:
        with conn.transaction():  # a savepoint: a refused insert must not poison the request's transaction
            row = conn.execute(
                "insert into profiles (id, user_id, age_confirmed, consent_at) "
                "values (gen_random_uuid(), %s, %s, case when %s then now() end) "
                "on conflict (user_id) do update set user_id = excluded.user_id returning id",
                (claims.sub, consented, consented),
            ).fetchone()
    except errors.ForeignKeyViolation as e:
        # An access token stays valid for up to an hour after the account is deleted; it must not
        # bring a profile back to life.
        raise AccountGone(str(claims.sub)) from e
    assert row is not None
    return row["id"]  # type: ignore[no-any-return]


def record_consent(conn: Connection, pid: UUID) -> None:
    conn.execute(
        "update profiles set age_confirmed = true, consent_at = coalesce(consent_at, now()) where id = %s",
        (pid,),
    )


def account_summary(conn: Connection, pid: UUID) -> dict[str, Any]:
    row = conn.execute(
        "select age_confirmed, consent_at::text as consent_at, created_at::text as created_at "
        "from profiles where id = %s",
        (pid,),
    ).fetchone()
    return dict(row) if row else {}


@dataclass(frozen=True)
class MergeResult:
    events: int = 0  # moved into the account
    saved: int = 0  # of those, how many are saves
    imports: int = 0


def merge_guest(conn: Connection, account_pid: UUID, guest_pid: UUID) -> MergeResult:
    """Move a guest (cookie) profile's events and imports into the account, then drop the guest.

    Only a profile with no owner can be merged, and the destination is always the caller's own, so
    this cannot be used to pull events out of anyone else's account. Duplicates (same work and kind,
    in the guest or already in the account) are collapsed to the newest one.
    """
    if guest_pid == account_pid:
        return MergeResult()
    guest = conn.execute("select user_id from profiles where id = %s for update", (guest_pid,)).fetchone()
    if guest is None or guest["user_id"] is not None:
        return MergeResult()
    moved = conn.execute(
        "with newest as ("
        "  select distinct on (g.work_id, g.kind) g.work_id, g.kind, g.weight, g.source, g.ts "
        "  from events g where g.profile_id = %(g)s "
        "  order by g.work_id, g.kind, g.ts desc"
        "), inserted as ("
        "  insert into events (profile_id, work_id, kind, weight, source, ts) "
        "  select %(a)s, n.work_id, n.kind, n.weight, n.source, n.ts from newest n "
        "  where not exists (select 1 from events a "
        "    where a.profile_id = %(a)s and a.work_id = n.work_id and a.kind = n.kind) "
        "  returning kind"
        ") select count(*) as events, count(*) filter (where kind = 'save') as saved from inserted",
        {"g": guest_pid, "a": account_pid},
    ).fetchone()
    imports = conn.execute(
        "update imports set profile_id = %s where profile_id = %s", (account_pid, guest_pid)
    ).rowcount
    conn.execute("delete from profiles where id = %s and user_id is null", (guest_pid,))
    assert moved is not None
    return MergeResult(events=moved["events"], saved=moved["saved"], imports=imports)


def delete_account_data(conn: Connection, user_id: UUID) -> int:
    """Remove the user's profile; events and imports go with it (on delete cascade)."""
    return conn.execute("delete from profiles where user_id = %s", (user_id,)).rowcount


def export_imports(conn: Connection, pid: UUID) -> list[dict[str, Any]]:
    rows = conn.execute(
        "select source, status, matched, unmatched, error, created_at::text as created_at, "
        "finished_at::text as finished_at from imports where profile_id = %s order by created_at desc",
        (pid,),
    ).fetchall()
    return [dict(r) for r in rows]
