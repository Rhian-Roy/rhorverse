from fastapi import APIRouter, Query

from rhorverse.schemas import MediaType, SearchResult

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResult)
def search(q: str = Query("", max_length=200), media: MediaType | None = None) -> SearchResult:
    # TODO: pg_trgm similarity on works.title + vector search on vibe embeddings.
    return SearchResult(query=q, media=media, items=[])
