import numpy as np

from rhorverse.rec.vec import parse_pgvector, to_pgvector


def test_round_trip():
    v = np.array([0.1, -0.25, 1.0], dtype=np.float32)
    assert to_pgvector(v) == "[0.1,-0.25,1]"
    np.testing.assert_allclose(parse_pgvector(to_pgvector(v)), v, rtol=1e-6)


def test_empty():
    assert parse_pgvector("[]").size == 0
