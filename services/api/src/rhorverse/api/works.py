from fastapi import APIRouter, HTTPException, Query

from rhorverse.schemas import MediaType, Work, WorkDetail

router = APIRouter(prefix="/works", tags=["works"])

# TODO: replace with SQL against `works` once ingest lands.
_SAMPLE = [
    WorkDetail(
        id="m1", media="movie", title="Sample Film: Low Orbit", year=2024, source="sample", source_id="m1"
    ),
]


@router.get("", response_model=list[Work])
def list_works(media: MediaType | None = None, limit: int = Query(20, ge=1, le=100)) -> list[Work]:
    return [w for w in _SAMPLE if media is None or w.media == media][:limit]


@router.get("/{work_id}", response_model=WorkDetail)
def get_work(work_id: str) -> WorkDetail:
    for w in _SAMPLE:
        if w.id == work_id:
            return w
    raise HTTPException(status_code=404, detail="work not found")
