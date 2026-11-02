"""User taste vector = weighted, time-decayed mean of embeddings of works they engaged with."""

import numpy as np

EVENT_WEIGHTS = {"like": 1.0, "consumed": 0.6, "save": 0.5, "view": 0.1, "skip": -0.2, "dislike": -0.8}
HALF_LIFE_DAYS = 90.0


def decay(age_days: float, half_life: float = HALF_LIFE_DAYS) -> float:
    """Recency weight: 1 for now, 0.5 after one half-life. Future timestamps count as now."""
    return 0.5 ** (max(age_days, 0.0) / half_life)


def taste_vector(embeddings: np.ndarray, weights: np.ndarray) -> np.ndarray | None:
    """Embeddings (n, d) and per-event weights (n,) → unit vector (d,), or None if no signal."""
    if embeddings.size == 0:
        return None
    v = (weights[:, None] * embeddings).sum(axis=0)
    norm = np.linalg.norm(v)
    return None if norm == 0 else v / norm
