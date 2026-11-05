from dataclasses import dataclass

from fastapi import APIRouter, Depends, Query
from psycopg import Connection

from rhorverse.db import get_conn
from rhorverse.rec.fuse import rrf
from rhorverse.repo import row_to_work
from rhorverse.schemas import MediaType, SearchResult, Work

router = APIRouter(tags=["search"])

MIN_QUERY_LEN = 2
VECTOR_CANDIDATES = 50

_COLUMNS = "id, media, source, source_id, title, year, overview, tags, images, popularity"

# `%%` is a literal % for psycopg. `<%` = word-similarity operator (uses works_title_trgm for titles).
# Albums also match on their artist (facets.artist), scored a touch below an equal title match.
_FILTERS = """
  (%(media)s::media_type is null or media = %(media)s::media_type)
  and (not %(in_india)s or exists (
    select 1 from availability a where a.work_id = works.id and a.region = 'IN'))
  and (not %(free)s or exists (
    select 1 from availability a
    where a.work_id = works.id and a.region = 'IN' and a.kind in ('free', 'ads')))
  and (not %(under_2h)s or (media = 'movie' and (facets->'runtime_min'->>0)::int < 120))
"""

_LEXICAL = f"""
with w as (
  select *, coalesce(facets->'artist'->>0, '') as artist
  from works
  where {_FILTERS}
)
select {_COLUMNS},
       greatest(word_similarity(%(q)s, title), similarity(%(q)s, title),
                0.95 * word_similarity(%(q)s, artist))
         + case when title ilike %(prefix)s or artist ilike %(prefix)s then 0.15 else 0 end
         + 0.1 * similarity(%(q)s, title)  -- whole-title match beats "Interstellar (Soundtrack)"
         + 0.05 * ln(1 + popularity) / ln(1 + greatest((select max(popularity) from works), 1))
         as score
from w
where %(q)s <%% title or title ilike %(prefix)s or %(q)s <%% artist or artist ilike %(prefix)s
order by score desc, popularity desc
limit %(limit)s
"""

# No search text, but a filter is set: browse what matches, most popular first.
_BROWSE = f"""
select {_COLUMNS} from works where {_FILTERS} order by popularity desc, id limit %(limit)s
"""

_VECTOR = f"""
select {_COLUMNS}
from works
where embedding is not null
  and {_FILTERS}
order by embedding <=> %(vec)s::vector
limit %(limit)s
"""


@dataclass(frozen=True)
class Filters:
    in_india: bool = False  # has an India provider
    free: bool = False  # free or ad-supported in India
    under_2h: bool = False  # films under two hours; a series has no single runtime to compare

    @property
    def active(self) -> bool:
        return self.in_india or self.free or self.under_2h


def _like_prefix(q: str) -> str:
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"{escaped}%"


def search_works(
    conn: Connection,
    q: str,
    media: MediaType | None = None,
    limit: int = 20,
    query_vec: list[float] | None = None,
    filters: Filters = Filters(),  # noqa: B008
) -> list[Work]:
    """Title (and album-artist) search: trigram + prefix + popularity.

    With `query_vec`, fuse in vector similarity via RRF.
    """
    q = q.strip()
    params = {
        "media": media,
        "limit": limit,
        "in_india": filters.in_india,
        "free": filters.free,
        "under_2h": filters.under_2h,
    }
    if len(q) < MIN_QUERY_LEN:
        if media is None and not filters.active:
            return []
        return [row_to_work(r) for r in conn.execute(_BROWSE, params).fetchall()]
    # Tolerate typos ("duen" → Dune); the default 0.6 is too strict for short titles.
    conn.execute("select set_config('pg_trgm.word_similarity_threshold', '0.3', true)")
    lexical = conn.execute(_LEXICAL, {**params, "q": q, "prefix": _like_prefix(q)}).fetchall()
    rows = {r["id"]: r for r in lexical}
    ranked = [r["id"] for r in lexical]
    if query_vec is not None:
        vec = "[" + ",".join(str(x) for x in query_vec) + "]"
        nearest = conn.execute(_VECTOR, {**params, "vec": vec, "limit": VECTOR_CANDIDATES}).fetchall()
        rows.update({r["id"]: r for r in nearest})
        ranked = rrf([ranked, [r["id"] for r in nearest]])
    return [row_to_work(rows[i]) for i in ranked[:limit]]


@router.get("/search", response_model=SearchResult)
def search(
    q: str = Query("", max_length=200),
    media: MediaType | None = None,
    limit: int = Query(20, ge=1, le=60),
    in_india: bool = False,
    free: bool = False,
    under_2h: bool = False,
    conn: Connection = Depends(get_conn),  # noqa: B008
) -> SearchResult:
    filters = Filters(in_india=in_india, free=free, under_2h=under_2h)
    return SearchResult(query=q, media=media, items=search_works(conn, q, media, limit, filters=filters))
