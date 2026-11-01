import numpy as np

from rhorverse.rec.rank import Weights, score, top_k


def test_similarity_dominates_by_default():
    s = score(np.array([0.9, 0.1]), np.array([0.0, 100.0]), np.array([0.0, 1.0]))
    assert top_k(s, 1) == [0]


def test_popularity_only_weights():
    s = score(np.array([0.9, 0.1]), np.array([0.0, 100.0]), np.zeros(2), Weights(0, 1, 0))
    assert top_k(s, 2) == [1, 0]


def test_top_k_handles_empty():
    assert top_k(np.array([]), 5) == []
