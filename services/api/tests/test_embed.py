"""Embedding job against a real Postgres (rolled back), with a fake encoder so torch isn't needed."""

import numpy as np
import psycopg

from rhorverse.ingest.normalize import WorkRow
from rhorverse.ingest.store import upsert_works
from rhorverse.rec.embed import DIM, embed_missing


def fake_encode(texts: list[str]) -> np.ndarray:
    out = np.zeros((len(texts), DIM), dtype=np.float32)
    out[:, 0] = 1.0
    return out


def test_embeds_only_missing_rows(conn: psycopg.Connection) -> None:
    # Isolate from real catalogue rows: give everything else an embedding first.
    conn.execute(
        "update works set embedding = array_fill(0.5::real, array[384])::vector where embedding is null"
    )
    row = WorkRow(media="movie", source="test", source_id="movie/e1", title="Embed Me")  # type: ignore[arg-type]
    upsert_works(conn, [row])

    assert embed_missing(conn, fake_encode) == 1
    first = conn.execute("select embedding::text as e from works where id = 'test:movie/e1'").fetchone()["e"]
    assert first.startswith("[1,0,")
    assert embed_missing(conn, fake_encode) == 0
