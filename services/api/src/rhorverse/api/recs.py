from fastapi import APIRouter

from rhorverse.schemas import HomeFeed, Rail

router = APIRouter(prefix="/recs", tags=["recs"])


@router.get("/home", response_model=HomeFeed)
def home(profile_id: str | None = None) -> HomeFeed:
    # TODO: profile vector → rank → MMR → exclude consumed → explain.
    return HomeFeed(hero=[], rails=[])


@router.get("/because/{work_id}", response_model=Rail)
def because(work_id: str, profile_id: str | None = None) -> Rail:
    return Rail(id=f"because-{work_id}", title="Because you liked this", items=[])
