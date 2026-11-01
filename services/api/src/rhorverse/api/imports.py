from fastapi import APIRouter

from rhorverse.schemas import ImportResult, ImportSource

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/{source}", response_model=ImportResult, status_code=202)
def start_import(source: ImportSource) -> ImportResult:
    # TODO: accept CSV upload / username, parse via rhorverse.imports.<source>, match, store.
    return ImportResult(source=source, status="queued")
