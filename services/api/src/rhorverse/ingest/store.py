"""Shared writers for ingesters: upsert into works / work_links / availability."""

from collections.abc import Iterable
from dataclasses import dataclass

from psycopg import Connection
from psycopg.types.json import Jsonb

from rhorverse.ingest.normalize import WorkRow


@dataclass(frozen=True)
class AvailabilityItem:
    provider: str
    kind: str
    link: str | None = None
    logo: str | None = None


_UPSERT_WORK = """
insert into works (id, media, source, source_id, title, year, overview, vibe_text,
                   tags, facets, images, popularity)
values (%(id)s, %(media)s, %(source)s, %(source_id)s, %(title)s, %(year)s, %(overview)s,
        %(vibe_text)s, %(tags)s, %(facets)s, %(images)s, %(popularity)s)
on conflict (source, source_id) do update set
    title      = excluded.title,
    year       = excluded.year,
    overview   = excluded.overview,
    -- a changed vibe_text makes the stored embedding stale; unchanged keeps it
    embedding  = case when works.vibe_text is distinct from excluded.vibe_text
                      then null else works.embedding end,
    vibe_text  = excluded.vibe_text,
    tags       = excluded.tags,
    facets     = excluded.facets,
    images     = excluded.images,
    popularity = excluded.popularity,
    updated_at = now()
"""


def work_id(row: WorkRow) -> str:
    return f"{row.source}:{row.source_id}"


def upsert_works(conn: Connection, rows: Iterable[WorkRow]) -> int:
    """Insert or update rows keyed by (source, source_id). Returns rows written."""
    params = [
        {
            "id": work_id(r),
            "media": r.media,
            "source": r.source,
            "source_id": r.source_id,
            "title": r.title,
            "year": r.year,
            "overview": r.overview,
            "vibe_text": r.vibe_text,
            "tags": r.tags,
            "facets": Jsonb(r.extra),
            "images": Jsonb(r.images),
            "popularity": r.popularity,
        }
        for r in rows
    ]
    if params:
        with conn.cursor() as cur:
            cur.executemany(_UPSERT_WORK, params)
    return len(params)


def replace_availability(conn: Connection, wid: str, region: str, items: Iterable[AvailabilityItem]) -> None:
    """Make `region`'s availability for a work exactly `items` (drops stale providers)."""
    conn.execute("delete from availability where work_id = %s and region = %s", (wid, region))
    with conn.cursor() as cur:
        cur.executemany(
            "insert into availability (work_id, region, provider, kind, link, logo) "
            "values (%s, %s, %s, %s, %s, %s) on conflict do nothing",
            [(wid, region, i.provider, i.kind, i.link, i.logo) for i in items],
        )


def add_links(conn: Connection, wid: str, links: Iterable[tuple[str, str]]) -> None:
    """Add (scheme, value) cross-source identifiers, e.g. ('imdb', 'tt0133093')."""
    with conn.cursor() as cur:
        cur.executemany(
            "insert into work_links (work_id, scheme, value) values (%s, %s, %s) on conflict do nothing",
            [(wid, scheme, value) for scheme, value in links],
        )
