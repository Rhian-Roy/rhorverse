"""Imported history → matched works → events. Missing films are fetched from TMDB first."""

from uuid import UUID

from psycopg import Connection

from rhorverse.imports import letterboxd
from rhorverse.imports.letterboxd import ImportedItem
from rhorverse.imports.match import Candidate, best_match
from rhorverse.ingest import tmdb
from rhorverse.ingest.http import Http
from rhorverse.repo import ensure_profile
from rhorverse.schemas import ImportResult

SOURCE = "letterboxd"
LIKE_AT = 4.0  # stars, 0.5 to 5
DISLIKE_AT = 1.5
MAX_LOOKUPS = 150
SHOW_UNMATCHED = 20


def find_match(conn: Connection, item: ImportedItem) -> str | None:
    """Trigram-narrowed candidates, then the shared fuzzy title + year matcher."""
    rows = conn.execute(
        "select id, title, year from works where media = 'movie' "
        "and (title %% %(t)s or title ilike %(t)s) order by similarity(title, %(t)s) desc limit 10",
        {"t": item.title},
    ).fetchall()
    hit = best_match(item.title, item.year, (Candidate(r["id"], r["title"], r["year"]) for r in rows))
    return hit.id if hit else None


def find_matches(conn: Connection, items: list[ImportedItem]) -> dict[ImportedItem, str]:
    return {item: wid for item in items if (wid := find_match(conn, item))}


def event_kinds(item: ImportedItem) -> list[str]:
    kinds = ["consumed"]
    if item.rating is not None and item.rating >= LIKE_AT:
        kinds.append("like")
    elif item.rating is not None and item.rating <= DISLIKE_AT:
        kinds.append("dislike")
    return kinds


def store_events(conn: Connection, pid: UUID, matches: dict[ImportedItem, str]) -> int:
    """Insert import events, skipping ones already imported, so re-importing a file adds nothing."""
    added = 0
    for item, wid in matches.items():
        for kind in event_kinds(item):
            cur = conn.execute(
                "insert into events (profile_id, work_id, kind, source, ts) "
                "select %(p)s, %(w)s, %(k)s, %(s)s, coalesce(%(ts)s::timestamptz, now()) "
                "where not exists (select 1 from events where profile_id = %(p)s and work_id = %(w)s "
                "and kind = %(k)s and source = %(s)s)",
                {"p": pid, "w": wid, "k": kind, "s": SOURCE, "ts": item.watched_at},
            )
            added += cur.rowcount
    return added


def import_letterboxd(
    conn: Connection, pid: UUID, raw: str, http: Http | None = None, max_lookups: int = MAX_LOOKUPS
) -> ImportResult:
    """Raises ValueError for a file that isn't a Letterboxd export. Other failures are recorded."""
    items = list(letterboxd.parse(raw))
    ensure_profile(conn, pid)
    try:
        with conn.transaction():  # savepoint: a failure leaves only the `failed` imports row
            matches = find_matches(conn, items)
            missing = [i for i in items if i not in matches]
            fetched = 0
            if missing and http is not None:
                fetched = tmdb.fetch_movies(conn, http, [(i.title, i.year) for i in missing], max_lookups)
                matches |= find_matches(conn, missing)
            store_events(conn, pid, matches)
    except Exception as e:
        conn.execute(
            "insert into imports (profile_id, source, status, error, finished_at) "
            "values (%s, %s, 'failed', %s, now())",
            (pid, SOURCE, str(e)[:500]),
        )
        return ImportResult(source=SOURCE, status="failed")

    unmatched = [i for i in items if i not in matches]
    conn.execute(
        "insert into imports (profile_id, source, status, matched, unmatched, finished_at) "
        "values (%s, %s, 'done', %s, %s, now())",
        (pid, SOURCE, len(matches), len(unmatched)),
    )
    return ImportResult(
        source=SOURCE,
        status="done",
        matched=len(matches),
        unmatched=len(unmatched),
        fetched=fetched,
        unmatched_titles=[i.title for i in unmatched[:SHOW_UNMATCHED]],
    )
