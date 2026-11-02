"""Local sentence-transformers embeddings (MPS when available) → works.embedding (pgvector).

Needs the optional `ml` group: `uv sync --project services/api --group ml`.
"""

from __future__ import annotations

import argparse
from collections.abc import Callable
from functools import cache
from typing import TYPE_CHECKING

from rhorverse.rec.vec import to_pgvector

if TYPE_CHECKING:
    import numpy as np
    from psycopg import Connection

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"  # 384-d, matches vector(384)
DIM = 384


@cache
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


BATCH = 64
Encoder = Callable[[list[str]], "np.ndarray"]


def embed_missing(conn: Connection, encode_fn: Encoder, limit: int | None = None) -> int:
    """Embed works whose embedding is null (new, or vibe_text changed). Returns how many were written."""
    rows = conn.execute(
        "select id, coalesce(vibe_text, title) as text from works where embedding is null order by id "
        "limit %s",
        (limit,),
    ).fetchall()
    for start in range(0, len(rows), BATCH):
        chunk = rows[start : start + BATCH]
        vectors = encode_fn([r["text"] for r in chunk])
        with conn.cursor() as cur:
            cur.executemany(
                "update works set embedding = %s::vector where id = %s",
                [(to_pgvector(v), r["id"]) for r, v in zip(chunk, vectors, strict=True)],
            )
    return len(rows)


def run(limit: int | None = None) -> int:  # pragma: no cover - requires ml group + DB
    from rhorverse import db

    with db.connection() as conn:
        n = embed_missing(conn, encode, limit)
    print(f"embedded {n} works")
    return n


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int)
    run(parser.parse_args().limit)
