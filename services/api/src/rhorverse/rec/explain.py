"""Template explanations ("Because you liked X…")."""

from rhorverse.schemas import Explanation


def because(anchor_id: str, anchor_title: str, shared_tags: list[str]) -> Explanation:
    if shared_tags:
        reason = f"Shares {', '.join(shared_tags[:2])} with {anchor_title}."
    else:
        reason = f"People who enjoyed {anchor_title} often pick this next."
    return Explanation(because_id=anchor_id, because_title=anchor_title, reason=reason)
