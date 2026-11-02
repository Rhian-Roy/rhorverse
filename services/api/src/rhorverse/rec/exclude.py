"""Hard exclusion: never recommend what the user already consumed, disliked or imported."""

from collections.abc import Callable, Iterable, Sequence
from typing import Any

EXCLUDING_KINDS = frozenset({"consumed", "dislike"})


def excluded_ids(events: Iterable[tuple[str, str]], kinds: frozenset[str] = EXCLUDING_KINDS) -> set[str]:
    """events: (work_id, kind) pairs → work ids to drop. Surfaces can widen `kinds` (e.g. add "like")."""
    return {work_id for work_id, kind in events if kind in kinds}


def apply[T](items: Sequence[T], ids: set[str], key: Callable[[T], Any] = lambda x: x.id) -> list[T]:
    return [it for it in items if key(it) not in ids]
