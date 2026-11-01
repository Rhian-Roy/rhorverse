"""Last.fm: tags and similar artists. Be polite: <= 5 req/s."""

import argparse

from rhorverse.config import get_settings
from rhorverse.ingest.http import Http

SOURCE = "lastfm"


def client() -> Http:
    return Http(SOURCE, rate=4)


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
