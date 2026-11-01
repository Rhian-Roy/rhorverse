import numpy as np

from rhorverse.rec.mmr import mmr


def test_mmr_prefers_diverse_second_pick():
    emb = np.array([[1.0, 0.0], [1.0, 0.0], [0.0, 1.0]])
    rel = np.array([1.0, 0.95, 0.8])
    assert mmr(rel, emb, k=2, lam=0.5) == [0, 2]


def test_mmr_pure_relevance_when_lambda_one():
    emb = np.eye(3)
    assert mmr(np.array([0.2, 0.9, 0.5]), emb, k=3, lam=1.0) == [1, 2, 0]
