"""iTunes Search API (country=IN): India-catalog search + previews. ~20 req/min."""

import argparse

from rhorverse.config import get_settings
from rhorverse.ingest.http import Http

SOURCE = "itunes"


def client() -> Http:
    return Http(SOURCE, rate=0.3)


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
