from fastapi import APIRouter, Body, Depends, HTTPException
from psycopg import Connection

from rhorverse.api.identity import effective_profile_id
from rhorverse.api.profile import require_profile_id
from rhorverse.config import get_settings
from rhorverse.db import get_conn
from rhorverse.imports.run import import_letterboxd
from rhorverse.ingest import tmdb
from rhorverse.ingest.http import Http
from rhorverse.schemas import ImportResult, ImportSource

router = APIRouter(prefix="/imports", tags=["imports"])

MAX_BYTES = 5 * 1024 * 1024


def tmdb_http() -> Http | None:
    """TMDB client for fetching missing films, or None (match against the catalogue only)."""
    return tmdb.client() if get_settings().tmdb_read_token else None


# Raw CSV body rather than a multipart upload, so no python-multipart dependency.
@router.post("/letterboxd", response_model=ImportResult, status_code=202)
def letterboxd(
    body: bytes = Body(..., media_type="text/csv"),
    conn: Connection = Depends(get_conn),  # noqa: B008
    http: Http | None = Depends(tmdb_http),  # noqa: B008
    profile_id: str | None = Depends(effective_profile_id),
) -> ImportResult:
    pid = require_profile_id(profile_id)
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="export is larger than 5 MB")
    try:
        return import_letterboxd(conn, pid, body.decode("utf-8", errors="replace"), http)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/{source}", response_model=ImportResult, status_code=202)
def start_import(source: ImportSource) -> ImportResult:
    # TODO: netflix / anilist / steam importers.
    return ImportResult(source=source, status="queued")
