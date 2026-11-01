#!/usr/bin/env bash
# Dumps the local canopy-pg database and restores it into Supabase.
# Uses pg_dump inside the container (server is pg17; local client may be older).
# Usage: SUPABASE_DB_URL=postgresql://... scripts/push_to_supabase.sh
set -euo pipefail
cd "$(dirname "$0")/.."

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase session-mode connection string)}"
DUMP="data/exports/canopy-$(date +%Y%m%d-%H%M%S).dump"
mkdir -p data/exports

echo "Dumping local canopy-pg → $DUMP"
docker exec canopy-pg pg_dump -U postgres -d canopy -Fc --no-owner --no-privileges > "$DUMP"

read -r -p "Restore into Supabase (this replaces existing objects)? [y/N] " answer
[[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "aborted"; exit 1; }

docker run --rm -i pgvector/pgvector:pg17 \
  pg_restore --clean --if-exists --no-owner --no-privileges -d "$SUPABASE_DB_URL" < "$DUMP"
echo "done"
