"""Media tab feeds (Movies, TV, Anime, Music, Games): personal, popular, new and genre rails."""

from psycopg import Connection

from rhorverse.rec.exclude import excluded_ids
from rhorverse.rec.feed import (
    _FACET_SQL,
    HERO_SIZE,
    HOME_EXCLUDING,
    MEDIA_VARIANT,
    MIN_RAIL,
    RAIL_SIZE,
    Facet,
    _facet_params,
    candidates,
    cold_hero,
    load_signals,
    personal_hero,
    popular,
    rank_rail,
    taste_from,
)
from rhorverse.repo import row_to_work
from rhorverse.schemas import FacetChip, MediaFeed, MediaType, Rail, Work

GENRE_RAILS = 4
MIN_GENRE_WORKS = 8
LABEL: dict[str, str] = {"movie": "movies", "tv": "TV", "anime": "anime", "music": "music", "game": "games"}

# Which facet each tab's chips filter by (the plan: languages, formats, platforms).
CHIP_FACET = {"movie": "language", "tv": "language", "anime": "format", "music": "genre", "game": "platforms"}
MIN_CHIP_WORKS = 3
MAX_CHIPS = 12
CHIP_LABEL = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "kn": "Kannada",
    "bn": "Bengali",
    "mr": "Marathi",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "cn": "Cantonese",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "tr": "Turkish",
    "th": "Thai",
    "TV": "TV series",
    "TV_SHORT": "TV shorts",
    "MOVIE": "Films",
    "SPECIAL": "Specials",
    "MUSIC": "Music videos",
}

_COLUMNS = "id, media, source, source_id, title, year, overview, tags, images, popularity"
# TMDB / AniList / RAWG store `genres`; iTunes stores `genre`.
_GENRES = "coalesce(facets->'genres', facets->'genre', '[]'::jsonb)"


def top_genres(conn: Connection, media: str, n: int = GENRE_RAILS) -> list[str]:
    """Most common genres for a medium that have enough works to fill a rail."""
    rows = conn.execute(
        f"select g, count(*) as n from works, jsonb_array_elements_text({_GENRES}) as g "
        "where media = %(media)s::media_type group by g having count(*) >= %(min)s "
        "order by n desc, g limit %(n)s",
        {"media": media, "min": MIN_GENRE_WORKS, "n": n},
    ).fetchall()
    return [r["g"] for r in rows]


def chips_for(conn: Connection, media: str) -> list[FacetChip]:
    """The chip bar: this medium's facet values with enough works to be worth filtering by."""
    key = CHIP_FACET.get(media)
    if key is None:
        return []
    rows = conn.execute(
        "select v, count(*) as n from works, jsonb_array_elements_text(facets->%(key)s::text) as v "
        "where media = %(media)s::media_type group by v having count(*) >= %(min)s "
        "order by n desc, v limit %(n)s",
        {"key": key, "media": media, "min": MIN_CHIP_WORKS, "n": MAX_CHIPS},
    ).fetchall()
    return [FacetChip(value=r["v"], label=CHIP_LABEL.get(r["v"], r["v"])) for r in rows]


def by_genre(
    conn: Connection, media: str, genre: str, exclude: set[str], limit: int = RAIL_SIZE, facet: Facet = None
) -> list[Work]:
    rows = conn.execute(
        f"select {_COLUMNS} from works where media = %(media)s::media_type "
        f"and {_GENRES} ? %(genre)s and {_FACET_SQL} and not (id = any(%(ex)s)) "
        "order by popularity desc, id limit %(limit)s",
        {"media": media, "genre": genre, "ex": list(exclude), "limit": limit, **_facet_params(facet)},
    ).fetchall()
    return [row_to_work(r) for r in rows]


def new_releases(
    conn: Connection, media: str, exclude: set[str], limit: int = RAIL_SIZE, facet: Facet = None
) -> list[Work]:
    rows = conn.execute(
        f"select {_COLUMNS} from works where media = %(media)s::media_type and year is not null "
        f"and {_FACET_SQL} and not (id = any(%(ex)s)) "
        "order by year desc, popularity desc, id limit %(limit)s",
        {"media": media, "ex": list(exclude), "limit": limit, **_facet_params(facet)},
    ).fetchall()
    return [row_to_work(r) for r in rows]


def build_media(
    conn: Connection, media: MediaType, profile_id: str | None, chip: str | None = None
) -> MediaFeed:
    """One tab. Liked / consumed / disliked works are excluded; no item repeats across rails."""
    signals = load_signals(conn, profile_id)
    exclude = excluded_ids(((s.work_id, s.kind) for s in signals), HOME_EXCLUDING)
    key = CHIP_FACET.get(media)
    facet: Facet = (key, chip) if key and chip else None
    variant = MEDIA_VARIANT[media]
    rails: list[Rail] = []
    shown: set[str] = set()

    def add(rail_id: str, title: str, items: list[Work], min_items: int = MIN_RAIL) -> None:
        if len(items) >= min_items:
            rails.append(Rail(id=rail_id, title=title, variant=variant, items=items))
            shown.update(w.id for w in items)

    taste = taste_from(signals)
    hero: list[Work] = []
    if taste is not None:
        picks = rank_rail(candidates(conn, taste, exclude, media=media, facet=facet))
        hero = personal_hero(picks, signals)
        add(f"{media}-for-you", "Picked for you", [row_to_work(c.row) for c in picks])
    add(
        f"{media}-popular",
        f"Popular {LABEL[media]}",
        popular(conn, media, exclude | shown, facet=facet),
        min_items=1,
    )
    add(f"{media}-new", "New releases", new_releases(conn, media, exclude | shown, facet=facet))
    for genre in top_genres(conn, media):
        add(f"{media}-genre-{genre}", genre, by_genre(conn, media, genre, exclude | shown, facet=facet))
    if not hero:
        hero = cold_hero(popular(conn, media, exclude, limit=HERO_SIZE * 4, facet=facet))
    return MediaFeed(hero=hero, rails=rails, chips=chips_for(conn, media))
