"""Writes apps/web/public/snapshots/*.json from the local database for API_MODE=snapshot.

Run with: just snapshot
"""

from __future__ import annotations

import json
from pathlib import Path

from rhorverse.db import connection

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "snapshots"

TABS = {"movies": "movie", "shows": "tv", "anime": "anime", "music": "music", "games": "game"}
VARIANT = {"music": "square", "game": "capsule"}


def fetch(media: str, limit: int = 20) -> list[dict]:
    with connection() as conn:
        rows = conn.execute(
            """
            select id, media::text, title, year, overview, tags, images, source, source_id
            from works where media = %s::media_type order by popularity desc limit %s
            """,
            (media, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def rail(rail_id: str, title: str, media: str, items: list[dict]) -> dict:
    return {
        "id": rail_id,
        "title": title,
        "variant": VARIANT.get(media, "poster"),
        "ranked": False,
        "items": items,
        "explanation": None,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    home_rails, hero = [], []
    for tab, media in TABS.items():
        items = fetch(media)
        if not items:
            print(f"skip {tab}: no works yet (run `just ingest <source>` first)")
            continue
        (OUT / f"{tab}.json").write_text(
            json.dumps([rail(f"{tab}-trending", f"Trending {tab}", media, items)], indent=2, default=str)
        )
        home_rails.append(rail(tab, tab.capitalize(), media, items[:12]))
        hero.extend(items[:1])
    if home_rails:
        (OUT / "home.json").write_text(json.dumps({"hero": hero, "rails": home_rails}, indent=2, default=str))
    print(f"snapshots → {OUT}")


if __name__ == "__main__":
    main()
