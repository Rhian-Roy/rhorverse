"""Home feed: taste vector → ANN candidates → score → MMR → exclude → explain → rails."""

from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import numpy as np
from psycopg import Connection

from rhorverse.rec import explain
from rhorverse.rec.exclude import EXCLUDING_KINDS, excluded_ids
from rhorverse.rec.mmr import mmr
from rhorverse.rec.profile import EVENT_WEIGHTS, decay, taste_vector
from rhorverse.rec.rank import score
from rhorverse.rec.vec import parse_pgvector, to_pgvector
from rhorverse.repo import parse_profile_id, row_to_work
from rhorverse.schemas import HomeFeed, Rail, Work

# Re-showing what you just liked looks broken, so the home feed drops likes too.
HOME_EXCLUDING = EXCLUDING_KINDS | {"like"}
CANDIDATES = 200
RAIL_SIZE = 20
MIN_RAIL = 4
MAX_ANCHORS = 3
HERO_SIZE = 5
LAMBDA = 0.7

_COLUMNS = "id, media, source, source_id, title, year, overview, tags, images, popularity"


@dataclass(frozen=True)
class Signal:
    work_id: str
    kind: str
    weight: float
    ts: datetime
    title: str
    tags: list[str]
    embedding: np.ndarray | None


@dataclass(frozen=True)
class Anchor:
    """A work that seeds a "Because you liked X" rail."""

    work_id: str
    title: str
    tags: list[str]
    embedding: np.ndarray


@dataclass(frozen=True)
class Candidate:
    row: dict[str, Any]
    embedding: np.ndarray
    similarity: float

    @property
    def id(self) -> str:
        return self.row["id"]


def load_signals(conn: Connection, profile_id: str | None) -> list[Signal]:
    """Latest event per (work, kind), newest first. Unknown or malformed ids → no signals."""
    pid = parse_profile_id(profile_id)
    if pid is None:
        return []
    rows = conn.execute(
        "select distinct on (e.work_id, e.kind) e.work_id, e.kind, e.weight, e.ts, w.title, w.tags, "
        "w.embedding::text as embedding "
        "from events e join works w on w.id = e.work_id where e.profile_id = %s "
        "order by e.work_id, e.kind, e.ts desc",
        (pid,),
    ).fetchall()
    signals = [
        Signal(
            work_id=r["work_id"],
            kind=r["kind"],
            weight=r["weight"],
            ts=r["ts"],
            title=r["title"],
            tags=list(r["tags"] or []),
            embedding=parse_pgvector(r["embedding"]) if r["embedding"] else None,
        )
        for r in rows
    ]
    return sorted(signals, key=lambda s: s.ts, reverse=True)


def taste_from(signals: list[Signal], now: datetime | None = None) -> np.ndarray | None:
    now = now or datetime.now(UTC)
    usable = [s for s in signals if s.embedding is not None and s.kind in EVENT_WEIGHTS]
    if not usable:
        return None
    weights = np.array(
        [EVENT_WEIGHTS[s.kind] * s.weight * decay((now - s.ts).total_seconds() / 86400) for s in usable]
    )
    return taste_vector(np.stack([s.embedding for s in usable]), weights)  # type: ignore[misc]


def candidates(conn: Connection, vec: np.ndarray, exclude: set[str], k: int = CANDIDATES) -> list[Candidate]:
    """Nearest works by cosine distance (HNSW), minus `exclude`."""
    rows = conn.execute(
        f"select {_COLUMNS}, embedding::text as embedding, "
        "1 - (embedding <=> %(v)s::vector) as similarity "
        "from works where embedding is not null and not (id = any(%(ex)s)) "
        "order by embedding <=> %(v)s::vector limit %(k)s",
        {"v": to_pgvector(vec), "ex": list(exclude), "k": k},
    ).fetchall()
    return [Candidate(r, parse_pgvector(r["embedding"]), float(r["similarity"])) for r in rows]


def rank_rail(cands: list[Candidate], k: int = RAIL_SIZE, lam: float = LAMBDA) -> list[Candidate]:
    """Blend similarity, popularity and freshness, then diversify with MMR."""
    if not cands:
        return []
    years = [c.row["year"] for c in cands]
    oldest = min((y for y in years if y), default=0)
    relevance = score(
        np.array([c.similarity for c in cands]),
        np.array([c.row["popularity"] for c in cands], dtype=float),
        np.array([y or oldest for y in years], dtype=float),
    )
    picked = mmr(relevance, np.stack([c.embedding for c in cands]), k, lam)
    return [cands[i] for i in picked]


def shared_tags(anchor_tags: list[str], items: list[Candidate], n: int = 2) -> list[str]:
    """Anchor tags that recur most across the rail, for the explanation."""
    anchor = set(anchor_tags)
    counts = Counter(t for c in items for t in set(c.row["tags"] or []) if t in anchor)
    return [t for t, _ in counts.most_common(n)]


def because_rail(
    conn: Connection, anchor: Anchor, exclude: set[str], k: int = RAIL_SIZE
) -> tuple[Rail, list[Candidate]]:
    items = rank_rail(candidates(conn, anchor.embedding, exclude | {anchor.work_id}), k)
    rail = Rail(
        id=f"because-{anchor.work_id}",
        title=f"More like {anchor.title}",
        variant="landscape",
        items=[row_to_work(c.row) for c in items],
        explanation=explain.because(anchor.work_id, anchor.title, shared_tags(anchor.tags, items)),
    )
    return rail, items


def popular(conn: Connection, media: str | None, exclude: set[str], limit: int = RAIL_SIZE) -> list[Work]:
    rows = conn.execute(
        f"select {_COLUMNS} from works "
        "where (%(media)s::media_type is null or media = %(media)s::media_type) "
        "and not (id = any(%(ex)s)) order by popularity desc, id limit %(limit)s",
        {"media": media, "ex": list(exclude), "limit": limit},
    ).fetchall()
    return [row_to_work(r) for r in rows]


def _hero(works: list[Work]) -> list[Work]:
    return [w for w in works if w.images.backdrop][:HERO_SIZE]


def build_home(conn: Connection, profile_id: str | None) -> HomeFeed:
    signals = load_signals(conn, profile_id)
    exclude = excluded_ids(((s.work_id, s.kind) for s in signals), HOME_EXCLUDING)
    shown: set[str] = set()
    rails: list[Rail] = []
    hero: list[Work] = []

    taste = taste_from(signals)
    if taste is not None:
        picked = [row_to_work(c.row) for c in rank_rail(candidates(conn, taste, exclude))]
        hero = _hero(picked)
        if len(picked) >= MIN_RAIL:
            rails.append(Rail(id="for-you", title="Picked for you", items=picked))
            shown |= {w.id for w in picked}

    likes = [s for s in signals if s.kind == "like" and s.embedding is not None][:MAX_ANCHORS]
    for s in likes:
        rail, items = because_rail(conn, Anchor(s.work_id, s.title, s.tags, s.embedding), exclude | shown)  # type: ignore[arg-type]
        if len(items) >= MIN_RAIL:
            rails.append(rail)
            shown |= {c.id for c in items}

    for media, title in (("movie", "Popular movies"), ("tv", "Popular TV")):
        items = popular(conn, media, exclude | shown)
        if items:
            rails.append(Rail(id=f"popular-{media}", title=title, items=items))

    if not hero:
        hero = _hero(popular(conn, None, exclude, limit=HERO_SIZE * 4))
    return HomeFeed(hero=hero, rails=rails)
