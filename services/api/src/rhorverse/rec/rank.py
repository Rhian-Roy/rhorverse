"""Scoring formula: blend similarity to taste, popularity and freshness."""

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Weights:
    similarity: float = 0.75
    popularity: float = 0.15
    freshness: float = 0.10


DEFAULT_WEIGHTS = Weights()


def score(
    similarity: np.ndarray,
    popularity: np.ndarray,
    freshness: np.ndarray,
    weights: Weights = DEFAULT_WEIGHTS,
) -> np.ndarray:
    """All inputs are (n,) arrays. Popularity and freshness are min-max normalised to [0, 1]."""

    def norm(x: np.ndarray) -> np.ndarray:
        span = x.max() - x.min() if x.size else 0
        return np.zeros_like(x, dtype=float) if span == 0 else (x - x.min()) / span

    return (
        weights.similarity * similarity
        + weights.popularity * norm(popularity)
        + weights.freshness * norm(freshness)
    )


def top_k(scores: np.ndarray, k: int) -> list[int]:
    k = min(k, scores.size)
    if k == 0:
        return []
    idx = np.argpartition(-scores, k - 1)[:k]
    return idx[np.argsort(-scores[idx])].tolist()
