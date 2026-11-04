#!/usr/bin/env bash
# Copies the local canopy-pg database into Supabase: migrations first, then every app table's
# rows (data only), loaded in one transaction. Prints row counts on both sides and the DB size.
# Usage: just push-supabase   (reads SUPABASE_DB_URL, the session-pooler URL, from .env)
# Never prints the URL. Safe to re-run: the target tables are emptied and reloaded.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set (run scripts/deploy_setup.sh first)}"
TABLES=(works work_links availability profiles events imports)
PG_IMAGE=pgvector/pgvector:pg17   # same major version as canopy-pg and Supabase

remote_psql() { docker run --rm -i -e PGURL="$SUPABASE_DB_URL" "$PG_IMAGE" sh -c 'psql "$PGURL" -v ON_ERROR_STOP=1 -X -q "$@"' psql "$@"; }
local_psql() { docker exec -i canopy-pg psql -U postgres -d canopy -X -q "$@"; }

counts_sql=""
for t in "${TABLES[@]}"; do counts_sql+="select '$t' as t, count(*) as n from $t union all "; done
counts_sql="${counts_sql% union all }"

echo "→ migrations on Supabase"
docker run --rm -i -e DATABASE_URL="$SUPABASE_DB_URL" -v "$PWD/db:/db:ro" -w /db "$PG_IMAGE" bash migrate.sh

DUMP="data/exports/supabase-push-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p data/exports
echo "→ dumping local data (${TABLES[*]})"
docker exec canopy-pg pg_dump -U postgres -d canopy --data-only --no-owner --no-privileges \
  $(printf -- '--table=public.%s ' "${TABLES[@]}") > "$DUMP"

echo "→ loading into Supabase (one transaction)"
{
  echo "begin;"
  echo "truncate $(IFS=,; echo "${TABLES[*]}") restart identity cascade;"
  cat "$DUMP"
  echo "commit;"
} | remote_psql >/dev/null   # silence the dump's setval() result rows

echo "→ row counts (local | supabase)"
paste <(local_psql -At -F' ' -c "$counts_sql") <(remote_psql -At -F' ' -c "$counts_sql") | awk '{ printf "  %-14s %7s | %-7s %s\n", $1, $2, $4, ($2==$4 ? "ok" : "MISMATCH") }'
echo "→ supabase size: $(remote_psql -At -c "select pg_size_pretty(pg_database_size(current_database()))")"
