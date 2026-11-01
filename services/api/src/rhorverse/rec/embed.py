"""Local sentence-transformers embeddings (MPS when available) → works.embedding (pgvector).

Needs the optional `ml` group: `uv sync --project services/api --group ml`.
"""

from __future__ import annotations

import argparse
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"  # 384-d, matches vector(384)
DIM = 384


def load_model():  # pragma: no cover - requires ml group
    try:
        import torch
        from sentence_transformers import SentenceTransformer
    except ImportError as e:
        raise SystemExit("Embedding needs the ml group: uv sync --project services/api --group ml") from e
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    return SentenceTransformer(MODEL_NAME, device=device)


def encode(texts: list[str], batch_size: int = 64) -> np.ndarray:  # pragma: no cover
    model = load_model()
    return model.encode(texts, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=True)


def run(limit: int | None = None) -> int:  # pragma: no cover
    # TODO: select works where embedding is null → encode(vibe_text) → update.
    load_model()
    print(f"embed stub: would embed up to {limit or 'all'} works")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int)
    run(parser.parse_args().limit)
