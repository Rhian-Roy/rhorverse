"""The Profile page's summary of a taste: ranked tags, seen counts, sources, "not interested"."""

from collections import defaultdict
from datetime import UTC, datetime

from psycopg import Connection

from rhorverse.rec.feed import load_signals
from rhorverse.rec.profile import EVENT_WEIGHTS, decay
from rhorverse.repo import parse_profile_id, row_to_work
from rhorverse.schemas import MediaType, TasteProfile, TasteTag

TOP_TAGS = 12


def ranked_tags(signals: list, now: datetime | None = None) -> list[TasteTag]:
    """Tags weighted the way the taste vector weighs events: by kind and recency."""
    now = now or datetime.now(UTC)
    totals: dict[str, float] = defaultdict(float)
    best: dict[tuple[str, MediaType], tuple[float, str]] = {}
    for s in signals:
        w = EVENT_WEIGHTS.get(s.kind, 0) * s.weight * decay((now - s.ts).total_seconds() / 86400)
        for tag in s.tags:
            totals[tag] += w
            if w > best.get((tag, s.media), (0.0, ""))[0]:
                best[(tag, s.media)] = (w, s.title)
    top = sorted(((t, v) for t, v in totals.items() if v > 0), key=lambda x: (-x[1], x[0]))[:TOP_TAGS]
    if not top:
        return []
    strongest = top[0][1]
    return [
        TasteTag(
            tag=tag,
            weight=round(v / strongest, 3),
            examples={media: title for (t, media), (_, title) in best.items() if t == tag},
        )
        for tag, v in top
    ]


def build_profile(conn: Connection, profile_id: str) -> TasteProfile:
    pid = parse_profile_id(profile_id)
    if pid is None:
        return TasteProfile(profile_id=profile_id)
    counts = conn.execute(
        "select w.media::text as media, count(distinct e.work_id) as n from events e "
        "join works w on w.id = e.work_id where e.profile_id = %s and e.kind = 'consumed' group by 1",
        (pid,),
    ).fetchall()
    sources = conn.execute(
        "select source, count(distinct work_id) as n from events where profile_id = %s group by 1", (pid,)
    ).fetchall()
    disliked = conn.execute(
        "select distinct on (w.id) w.id, w.media, w.source, w.source_id, w.title, w.year, w.overview, "
        "w.tags, w.images from events e join works w on w.id = e.work_id "
        "where e.profile_id = %s and e.kind = 'dislike' order by w.id",
        (pid,),
    ).fetchall()
    return TasteProfile(
        profile_id=profile_id,
        top_tags=ranked_tags(load_signals(conn, profile_id)),
        counts={r["media"]: r["n"] for r in counts},
        sources={r["source"]: r["n"] for r in sources},
        not_interested=[row_to_work(r) for r in disliked],
    )


def export_events(conn: Connection, profile_id: str) -> list[dict[str, object]]:
    """Everything stored about this anonymous profile, for the export button."""
    pid = parse_profile_id(profile_id)
    if pid is None:
        return []
    rows = conn.execute(
        "select e.work_id, w.title, w.media::text as media, e.kind, e.weight, e.source, e.ts::text as ts "
        "from events e join works w on w.id = e.work_id where e.profile_id = %s order by e.ts desc",
        (pid,),
    ).fetchall()
    return [dict(r) for r in rows]
