import numpy as np
import pytest

from rhorverse.rec.profile import decay, taste_vector


def test_decay_halves_after_half_life():
    assert decay(0) == 1.0
    assert decay(90) == pytest.approx(0.5)
    assert decay(-5) == 1.0


def test_taste_vector_is_unit_and_none_without_signal():
    v = taste_vector(np.array([[1.0, 0.0], [0.0, 1.0]]), np.array([1.0, 1.0]))
    assert v is not None
    assert np.linalg.norm(v) == pytest.approx(1.0)
    assert taste_vector(np.zeros((0, 2)), np.zeros(0)) is None
