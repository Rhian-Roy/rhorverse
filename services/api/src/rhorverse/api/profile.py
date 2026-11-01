from fastapi import APIRouter

from rhorverse.schemas import EventAck, EventIn, TasteProfile

router = APIRouter(tags=["profile"])


@router.post("/events", response_model=EventAck, status_code=202)
def post_events(events: list[EventIn]) -> EventAck:
    # TODO: insert into `events`; upsert `profiles`.
    return EventAck(accepted=len(events))


@router.get("/profile", response_model=TasteProfile)
def get_profile(profile_id: str) -> TasteProfile:
    return TasteProfile(profile_id=profile_id)
