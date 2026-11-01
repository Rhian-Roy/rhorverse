"""Offline ranking metrics."""

import math
from collections.abc import Sequence


def ndcg_at_k(ranked: Sequence[str], relevant: set[str], k: int = 10) -> float:
    """Binary-relevance NDCG@k."""
    dcg = sum(1 / math.log2(i + 2) for i, item in enumerate(ranked[:k]) if item in relevant)
    ideal = sum(1 / math.log2(i + 2) for i in range(min(len(relevant), k)))
    return dcg / ideal if ideal else 0.0
