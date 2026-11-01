"""Maximal Marginal Relevance re-ranking for diversity."""

import numpy as np


def mmr(relevance: np.ndarray, embeddings: np.ndarray, k: int, lam: float = 0.7) -> list[int]:
    """Pick k indices maximising lam*relevance - (1-lam)*max_sim_to_selected.

    `embeddings` (n, d) should be L2-normalised so dot product = cosine similarity.
    """
    n = relevance.shape[0]
    k = min(k, n)
    if k == 0:
        return []
    sims = embeddings @ embeddings.T
    selected: list[int] = [int(np.argmax(relevance))]
    candidates = set(range(n)) - set(selected)
    while len(selected) < k:
        cand = np.fromiter(candidates, dtype=int)
        redundancy = sims[np.ix_(cand, selected)].max(axis=1)
        mmr_scores = lam * relevance[cand] - (1 - lam) * redundancy
        best = int(cand[np.argmax(mmr_scores)])
        selected.append(best)
        candidates.remove(best)
    return selected
