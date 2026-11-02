from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg import Connection

from rhorverse.db import get_conn
from rhorverse.repo import row_to_detail, row_to_work
from rhorverse.schemas import MediaType, Work, WorkDetail

router = APIRouter(prefix="/works", tags=["works"])

REGION = "IN"
_COLUMNS = "id, media, source, source_id, title, year, overview, tags, images, facets, popularity"


@router.get("", response_model=list[Work])
def list_works(
    media: MediaType | None = None,
    limit: int = Query(20, ge=1, le=100),
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> list[Work]:
    rows = conn.execute(
        f"select {_COLUMNS} from works "
        "where (%(media)s::media_type is null or media = %(media)s::media_type) "
        "order by popularity desc limit %(limit)s",
        {"media": media, "limit": limit},
    ).fetchall()
    return [row_to_work(r) for r in rows]


# `:path` because ids look like "tmdb:movie/603" (they contain a slash).
@router.get("/{work_id:path}", response_model=WorkDetail)
def get_work(work_id: str, conn: Connection = Depends(get_conn)) -> WorkDetail:  # noqa: B008
    row = conn.execute(f"select {_COLUMNS} from works where id = %s", (work_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="work not found")
    availability = conn.execute(
        "select provider, kind, link, logo from availability where work_id = %s and region = %s "
        "order by array_position(array['flatrate','free','ads','rent','buy'], kind), provider",
        (work_id, REGION),
    ).fetchall()
    return row_to_detail(row, availability)
