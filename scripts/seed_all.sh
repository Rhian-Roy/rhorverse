#!/usr/bin/env bash
# Runs every ingester with a per-source cap. Usage: scripts/seed_all.sh [cap]
set -euo pipefail
cd "$(dirname "$0")/.."

CAP="${1:-200}"
for source in tmdb anilist igdb rawg deezer itunes musicbrainz lastfm; do
  echo "== $source (cap $CAP)"
  uv run --project services/api python -m "rhorverse.ingest.$source" --cap "$CAP"
done
