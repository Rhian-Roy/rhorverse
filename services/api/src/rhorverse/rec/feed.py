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
from rhorverse.schemas import Explanation, HomeFeed, Rail, TileVariant, Work

# Re-showing what you just liked looks broken, so the home feed drops likes too.
HOME_EXCLUDING = EXCLUDING_KINDS | {"like"}
CANDIDATES = 200
RAIL_SIZE = 20
MIN_RAIL = 4
MAX_ANCHORS = 3
HERO_SIZE = 5
TOP_N = 10
LAMBDA = 0.7

# Tile shape per medium: album art is square, RAWG only has landscape art.
MEDIA_VARIANT: dict[str, TileVariant] = {
    "movie": "poster",
    "tv": "poster",
    "anime": "poster",
    "music": "square",
    "game": "capsule",
}

POPULAR_RAILS: tuple[tuple[str, str, TileVariant], ...] = tuple(
    (media, f"Popular {label}", MEDIA_VARIANT[media])
    for media, label in (
        ("movie", "movies"),
        ("tv", "TV"),
        ("anime", "anime"),
        ("music", "music"),
        ("game", "games"),
    )
)

MEDIA_LABEL = {"movie": "film", "tv": "TV", "anime": "anime", "music": "music", "game": "games"}
REASON = {"like": "Because you liked", "save": "Because you saved", "consumed": "Because you watched"}

_COLUMNS = "id, media, source, source_id, title, year, overview, tags, images, popularity"


@dataclass(frozen=True)
class Signal:
    work_id: str
    kind: str
    weight: float
    ts: datetime
    title: str
    media: str
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
        "select distinct on (e.work_id, e.kind) e.work_id, e.kind, e.weight, e.ts, w.title, w.media, w.tags, "
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
            media=r["media"],
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


Facet = tuple[str, str] | None  # e.g. ("language", "hi")

_FACET_SQL = "(%(fk)s::text is null or facets->%(fk)s::text ? %(fv)s::text)"


def _facet_params(facet: Facet) -> dict[str, str | None]:
    return {"fk": facet[0] if facet else None, "fv": facet[1] if facet else None}


def candidates(
    conn: Connection,
    vec: np.ndarray,
    exclude: set[str],
    k: int = CANDIDATES,
    media: str | None = None,
    facet: Facet = None,
) -> list[Candidate]:
    """Nearest works by cosine distance (HNSW), minus `exclude`, optionally of one `media`."""
    # HNSW returns at most ef_search rows (default 40) before filters apply, which silently capped
    # k=200 at 40. Widen it to k for this transaction, and keep scanning past filtered-out rows.
    conn.execute("select set_config('hnsw.ef_search', %s, true)", (str(max(k, 40)),))
    conn.execute("select set_config('hnsw.iterative_scan', 'relaxed_order', true)")
    sql = (
        f"select {_COLUMNS}, embedding::text as embedding, "
        "1 - (embedding <=> %(v)s::vector) as similarity "
        "from works where embedding is not null and not (id = any(%(ex)s)) "
        f"and (%(media)s::media_type is null or media = %(media)s::media_type) and {_FACET_SQL} "
        "order by embedding <=> %(v)s::vector limit %(k)s"
    )
    params = {"v": to_pgvector(vec), "ex": list(exclude), "k": k, "media": media, **_facet_params(facet)}
    rows = conn.execute(sql, params).fetchall()
    if len(rows) < k and (media or facet):
        # The approximate index can fail to reach a distant cluster when filtering. Exact is cheap here.
        conn.execute("select set_config('enable_indexscan', 'off', true)")
        rows = conn.execute(sql, params).fetchall()
        conn.execute("select set_config('enable_indexscan', 'on', true)")
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
        variant="auto",
        items=[row_to_work(c.row) for c in items],
        explanation=explain.because(anchor.work_id, anchor.title, shared_tags(anchor.tags, items)),
    )
    return rail, items


def popular(
    conn: Connection, media: str | None, exclude: set[str], limit: int = RAIL_SIZE, facet: Facet = None
) -> list[Work]:
    rows = conn.execute(
        f"select {_COLUMNS} from works "
        "where (%(media)s::media_type is null or media = %(media)s::media_type) "
        f"and {_FACET_SQL} and not (id = any(%(ex)s)) order by popularity desc, id limit %(limit)s",
        {"media": media, "ex": list(exclude), "limit": limit, **_facet_params(facet)},
    ).fetchall()
    return [row_to_work(r) for r in rows]


def _hero(works: list[Work]) -> list[Work]:
    return [w for w in works if w.images.backdrop][:HERO_SIZE]


def nearest_signal(embedding: np.ndarray, signals: list[Signal]) -> Signal | None:
    """The positive signal most similar to `embedding`, preferring likes over saves and watches."""
    for kind in ("like", "save", "consumed"):
        pool = [s for s in signals if s.kind == kind and s.embedding is not None]
        if pool:
            return max(pool, key=lambda s: float(np.dot(embedding, s.embedding)))  # type: ignore[arg-type]
    return None


def personal_hero(picks: list[Candidate], signals: list[Signal]) -> list[Work]:
    hero = []
    for c in picks:
        anchor = nearest_signal(c.embedding, signals)
        why = f"{REASON[anchor.kind]} {anchor.title}" if anchor else "Picked for your taste"
        hero.append(row_to_work(c.row).model_copy(update={"why": why}))
    return _hero(hero)


def cold_hero(works: list[Work]) -> list[Work]:
    """`works` must be in popularity order: the rank shown is true within each medium."""
    seen: Counter[str] = Counter()
    hero = []
    for w in works:
        seen[w.media] += 1
        hero.append(w.model_copy(update={"why": f"#{seen[w.media]} most popular in {MEDIA_LABEL[w.media]}"}))
    return _hero(hero)


def saved_for_later(conn: Connection, signals: list[Signal], exclude: set[str]) -> list[Work]:
    ids = [s.work_id for s in signals if s.kind == "save" and s.work_id not in exclude][:RAIL_SIZE]
    if not ids:
        return []
    rows = conn.execute(f"select {_COLUMNS} from works where id = any(%s)", (ids,)).fetchall()
    by_id = {r["id"]: r for r in rows}
    return [row_to_work(by_id[i]) for i in ids if i in by_id]


def top_in_india(conn: Connection, exclude: set[str], limit: int = TOP_N) -> list[Work]:
    """Most popular films and shows that have an India provider. A popularity list, not a weekly chart."""
    rows = conn.execute(
        f"select {_COLUMNS} from works w where media in ('movie', 'tv') and not (id = any(%(ex)s)) "
        "and exists (select 1 from availability a where a.work_id = w.id and a.region = 'IN') "
        "order by popularity desc, id limit %(limit)s",
        {"ex": list(exclude), "limit": limit},
    ).fetchall()
    return [row_to_work(r) for r in rows]


def why_here(conn: Connection, work: dict[str, Any], signals: list[Signal]) -> Explanation | None:
    """Why this work suits this profile: its nearest positive signal and the tags they share."""
    if not work["embedding"]:
        return None
    others = [s for s in signals if s.work_id != work["id"]]
    anchor = nearest_signal(parse_pgvector(work["embedding"]), others)
    if anchor is None:
        return None
    mine = set(work["tags"] or [])
    return explain.because(anchor.work_id, anchor.title, [t for t in anchor.tags if t in mine])


def across_media(conn: Connection, work: dict[str, Any], exclude: set[str], per_medium: int = 2) -> Rail:
    """The nearest works from every other medium."""
    items: list[Work] = []
    if work["embedding"]:
        vec = parse_pgvector(work["embedding"])
        for media in MEDIA_VARIANT:
            if media != work["media"]:
                nearest = candidates(conn, vec, exclude | {work["id"]}, k=per_medium, media=media)
                items.extend(row_to_work(c.row) for c in nearest)
    return Rail(id=f"across-{work['id']}", title="Across media", variant="auto", items=items)


def build_home(conn: Connection, profile_id: str | None) -> HomeFeed:
    """Rails in the plan's order. A rail skips what earlier rails showed; consumed work never appears."""
    signals = load_signals(conn, profile_id)
    exclude = excluded_ids(((s.work_id, s.kind) for s in signals), HOME_EXCLUDING)
    shown: set[str] = set()
    rails: list[Rail] = []

    def add(rail: Rail, min_items: int = MIN_RAIL) -> None:
        if len(rail.items) >= min_items:
            rails.append(rail)
            shown.update(w.id for w in rail.items)

    def for_you(vec: np.ndarray, media: str) -> list[Work]:
        return [row_to_work(c.row) for c in rank_rail(candidates(conn, vec, exclude | shown, media=media))]

    add(
        Rail(
            id="saved",
            title="Saved for later",
            variant="auto",
            items=saved_for_later(conn, signals, exclude),
        ),
        min_items=1,
    )

    taste = taste_from(signals)
    hero: list[Work] = []
    if taste is not None:
        hero = personal_hero(rank_rail(candidates(conn, taste, exclude)), signals)
        add(Rail(id="for-you-movie", title="For you · Movies", items=for_you(taste, "movie")))
        add(Rail(id="for-you-anime", title="For you · Anime", items=for_you(taste, "anime")))

    likes = [s for s in signals if s.kind == "like" and s.embedding is not None]
    for s in likes[:MAX_ANCHORS]:
        rail, _ = because_rail(conn, Anchor(s.work_id, s.title, s.tags, s.embedding), exclude | shown)  # type: ignore[arg-type]
        add(rail)

    add(
        Rail(
            id="top-india",
            title="Top 10 available in India",
            ranked=True,
            items=top_in_india(conn, exclude | shown),
        )
    )

    if taste is not None:
        add(
            Rail(
                id="for-you-music",
                title="Albums for your taste",
                variant="square",
                items=for_you(taste, "music"),
            )
        )
    show = next((s for s in likes if s.media in ("tv", "anime")), None)
    if show is not None:
        games = [
            row_to_work(c.row)
            for c in rank_rail(candidates(conn, show.embedding, exclude | shown, media="game"))
        ]  # type: ignore[arg-type]
        add(Rail(id="games-like", title=f"Games like {show.title}", variant="capsule", items=games))

    for media, title, variant in POPULAR_RAILS:
        add(
            Rail(
                id=f"popular-{media}",
                title=title,
                variant=variant,
                items=popular(conn, media, exclude | shown),
            ),
            1,
        )

    if not hero:
        hero = cold_hero(popular(conn, None, exclude, limit=HERO_SIZE * 4))
    return HomeFeed(hero=hero, rails=rails)
