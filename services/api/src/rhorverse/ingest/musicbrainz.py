"""MusicBrainz: MBIDs and ISRC links. Strictly 1 req/s with a descriptive User-Agent."""

import argparse

from rhorverse.config import get_settings
from rhorverse.ingest.http import Http

SOURCE = "musicbrainz"


def client() -> Http:
    return Http(SOURCE, rate=1, user_agent=get_settings().musicbrainz_user_agent)


def run(cap: int = 100) -> int:
    """Fetch up to `cap` items and upsert them into `works`. Returns rows written."""
    _ = get_settings()
    # TODO: implement fetch → normalize.to_work_rows → upsert.
    print(f"[{SOURCE}] stub: would ingest up to {cap} items")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap", type=int, default=100)
    run(parser.parse_args().cap)
