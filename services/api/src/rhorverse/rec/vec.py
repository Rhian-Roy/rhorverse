"""pgvector ↔ numpy via the text form ('[0.1,0.2,…]'), so no pgvector Python package is needed."""

from collections.abc import Sequence

import numpy as np


def to_pgvector(vec: Sequence[float] | np.ndarray) -> str:
    return "[" + ",".join(f"{float(x):.6g}" for x in vec) + "]"


def parse_pgvector(text: str) -> np.ndarray:
    inner = text.strip().removeprefix("[").removesuffix("]")
    if not inner:
        return np.zeros(0, dtype=np.float32)
    return np.array([float(x) for x in inner.split(",")], dtype=np.float32)
