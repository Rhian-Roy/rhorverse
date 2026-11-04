"""Writes apps/web/public/snapshots/*.json from the local database for API_MODE=snapshot.

Uses the same feed builders as the live API (cold start, no profile), so snapshot mode and the
live site's fallback show exactly what a first-time visitor would see. Run with: just snapshot
"""

from __future__ import annotations

import json
from pathlib import Path

from rhorverse.db import connection
from rhorverse.rec.feed import build_home
from rhorverse.rec.tabs import build_media

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "snapshots"

TABS = {"movies": "movie", "shows": "tv", "anime": "anime", "music": "music", "games": "game"}


def write(name: str, data: object) -> None:
    (OUT / f"{name}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with connection() as conn:
        home = build_home(conn, None)
        write("home", home.model_dump(mode="json"))
        for tab, media in TABS.items():
            rails = build_media(conn, media, None)  # type: ignore[arg-type]
            write(tab, [r.model_dump(mode="json") for r in rails])
            print(f"{tab}: {len(rails)} rails")
        conn.rollback()
    print(f"home: {len(home.rails)} rails, {len(home.hero)} hero → {OUT}")


if __name__ == "__main__":
    main()
