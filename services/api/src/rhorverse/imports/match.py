"""Fuzzy title + year matching of imported history against `works`."""

import re
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass
from difflib import SequenceMatcher


@dataclass(frozen=True)
class Candidate:
    id: str
    title: str
    year: int | None = None


_ARTICLES = re.compile(r"^(the|a|an)\s+")
_NON_WORD = re.compile(r"[^\w\s]")


def normalize_title(title: str) -> str:
    t = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode().lower()
    t = _NON_WORD.sub(" ", t)
    t = _ARTICLES.sub("", " ".join(t.split()))
    return t


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_title(a), normalize_title(b)).ratio()


def best_match(
    title: str, year: int | None, candidates: Iterable[Candidate], threshold: float = 0.85
) -> Candidate | None:
    """Highest-similarity candidate; a year off by more than 1 is a hard mismatch."""
    best: tuple[float, Candidate] | None = None
    for c in candidates:
        if year and c.year and abs(year - c.year) > 1:
            continue
        s = similarity(title, c.title) + (0.05 if year and c.year == year else 0.0)
        if best is None or s > best[0]:
            best = (s, c)
    return best[1] if best and best[0] >= threshold else None
