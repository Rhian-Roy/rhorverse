from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection

from rhorverse.db import get_conn
from rhorverse.rec.exclude import excluded_ids
from rhorverse.rec.feed import HOME_EXCLUDING, Anchor, because_rail, build_home, load_signals
from rhorverse.rec.vec import parse_pgvector
from rhorverse.schemas import HomeFeed, Rail

router = APIRouter(prefix="/recs", tags=["recs"])


@router.get("/home", response_model=HomeFeed)
def home(profile_id: str | None = None, conn: Connection = Depends(get_conn)) -> HomeFeed:  # noqa: B008
    """Personal rails when the profile has signal; popular rails otherwise (cold start)."""
    return build_home(conn, profile_id)


# `:path` because ids look like "tmdb:movie/603" (they contain a slash).
@router.get("/because/{work_id:path}", response_model=Rail)
def because(
    work_id: str,
    profile_id: str | None = None,
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> Rail:
    row = conn.execute(
        "select id, title, tags, embedding::text as embedding from works where id = %s", (work_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="work not found")
    if row["embedding"] is None:  # not embedded yet (run `just embed`)
        return Rail(id=f"because-{work_id}", title=f"More like {row['title']}", items=[])
    signals = load_signals(conn, profile_id)
    exclude = excluded_ids(((s.work_id, s.kind) for s in signals), HOME_EXCLUDING)
    anchor = Anchor(row["id"], row["title"], list(row["tags"] or []), parse_pgvector(row["embedding"]))
    return because_rail(conn, anchor, exclude)[0]
