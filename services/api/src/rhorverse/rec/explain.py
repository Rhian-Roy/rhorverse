"""Template explanations ("Because you liked X…")."""

from rhorverse.schemas import Explanation


def because(anchor_id: str, anchor_title: str, shared_tags: list[str]) -> Explanation:
    if shared_tags:
        reason = f"Shares {' and '.join(shared_tags[:2])} with {anchor_title}."
    else:
        reason = f"Close in feel to {anchor_title}."
    return Explanation(
        because_id=anchor_id, because_title=anchor_title, reason=reason, shared_tags=shared_tags[:4]
    )
