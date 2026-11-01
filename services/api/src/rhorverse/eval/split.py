"""Train/test split of user events for offline evaluation (leave-last-n-out). Stub."""

from collections.abc import Sequence


def leave_last_out[T](events: Sequence[T], n: int = 1) -> tuple[list[T], list[T]]:
    """Events must already be sorted by time."""
    if n <= 0:
        return list(events), []
    return list(events[:-n]), list(events[-n:])
