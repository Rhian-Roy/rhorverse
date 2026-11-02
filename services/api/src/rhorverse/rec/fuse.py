"""Reciprocal rank fusion: merge several ranked id lists without normalising their scores."""


def rrf(rankings: list[list[str]], k: int = 60) -> list[str]:
    """Fuse ranked lists. An id scores sum(1 / (k + rank)) over the lists it appears in."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, item in enumerate(dict.fromkeys(ranking), start=1):
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=lambda i: (-scores[i], i))
