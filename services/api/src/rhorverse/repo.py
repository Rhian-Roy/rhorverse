"""Row → response-model mapping shared by routers."""

from typing import Any
from uuid import UUID

from psycopg import Connection

from rhorverse.schemas import ImageSet, Provider, Work, WorkDetail


def row_to_work(row: dict[str, Any]) -> Work:
    return Work(
        id=row["id"],
        media=row["media"],
        title=row["title"],
        year=row["year"],
        overview=row["overview"],
        tags=list(row["tags"] or []),
        images=ImageSet(**(row["images"] or {})),
        source=row["source"],
        source_id=row["source_id"],
    )


def row_to_detail(row: dict[str, Any], availability: list[dict[str, Any]]) -> WorkDetail:
    return WorkDetail(
        **row_to_work(row).model_dump(),
        facets={k: [str(v) for v in vals] for k, vals in (row["facets"] or {}).items()},
        availability=[
            Provider(name=a["provider"], kind=a["kind"], logo=a["logo"], link=a["link"]) for a in availability
        ],
    )


def parse_profile_id(raw: str | None) -> UUID | None:
    """Anonymous profile ids are UUIDs (the rhorverse_pid cookie). Anything else → None."""
    try:
        return UUID(raw) if raw else None
    except ValueError:
        return None


def ensure_profile(conn: Connection, pid: UUID) -> None:
    conn.execute("insert into profiles (id) values (%s) on conflict (id) do nothing", (pid,))
