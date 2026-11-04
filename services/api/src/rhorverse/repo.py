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


def source_url(row: dict[str, Any], links: dict[str, str]) -> str | None:
    """Link to the work on the provider it came from. `links` is scheme → value from work_links."""
    sid = row["source_id"]
    match row["source"]:
        case "tmdb":
            return f"https://www.themoviedb.org/{sid}"
        case "anilist":
            return f"https://anilist.co/anime/{sid}"
        case "rawg":
            return f"https://rawg.io/games/{links['rawg_slug']}" if "rawg_slug" in links else None
        case "itunes":
            return links.get("apple_url")
    return None


def row_to_detail(
    row: dict[str, Any], availability: list[dict[str, Any]], links: dict[str, str] | None = None
) -> WorkDetail:
    return WorkDetail(
        **row_to_work(row).model_dump(),
        facets={k: [str(v) for v in vals] for k, vals in (row["facets"] or {}).items()},
        availability=[
            Provider(name=a["provider"], kind=a["kind"], logo=a["logo"], link=a["link"]) for a in availability
        ],
        source_url=source_url(row, links or {}),
    )


def parse_profile_id(raw: str | None) -> UUID | None:
    """Anonymous profile ids are UUIDs (the rhorverse_pid cookie). Anything else → None."""
    try:
        return UUID(raw) if raw else None
    except ValueError:
        return None


def ensure_profile(conn: Connection, pid: UUID) -> None:
    conn.execute("insert into profiles (id) values (%s) on conflict (id) do nothing", (pid,))
