#!/usr/bin/env bash
# Copies local data into Supabase after applying migrations. Reads SUPABASE_DB_URL (session pooler)
# from .env via `just push-supabase`, and never prints it.
#
#   just push-supabase                 Catalogue merge (default): upserts works, links and availability.
#                                      Hosted profiles, events and imports are untouched.
#   just push-supabase --everything    Full replace of every app table, including hosted user data.
#                                      Asks first (add --yes to skip the question).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set (run scripts/deploy_setup.sh first)}"
MODE=merge
YES=no
for arg in "$@"; do
  case "$arg" in
    --everything) MODE=everything ;;
    --yes) YES=yes ;;
    *) echo "unknown option: $arg"; exit 2 ;;
  esac
done

CATALOGUE=(works work_links availability)
USER_DATA=(profiles events imports)
PG_IMAGE=pgvector/pgvector:pg17   # same major version as canopy-pg and Supabase

remote_psql() { docker run --rm -i -e PGURL="$SUPABASE_DB_URL" "$PG_IMAGE" sh -c 'psql "$PGURL" -v ON_ERROR_STOP=1 -X -q "$@"' psql "$@"; }
local_psql() { docker exec -i canopy-pg psql -U postgres -d canopy -X -q "$@"; }

count_sql() {
  local sql=""
  for t in "$@"; do sql+="select '$t' as t, count(*) as n from $t union all "; done
  echo "${sql% union all }"
}

echo "→ migrations on Supabase"
docker run --rm -i -e DATABASE_URL="$SUPABASE_DB_URL" -v "$PWD/db:/db:ro" -w /db "$PG_IMAGE" bash migrate.sh

merge_catalogue() {
  # Each table goes through a temp copy, so a failure leaves the hosted data as it was.
  echo "begin;"
  for t in "${CATALOGUE[@]}"; do
    echo "create temp table s_$t (like public.$t including defaults) on commit drop;"
    echo "copy s_$t from stdin;"
    local_psql -c "copy $t to stdout"
    echo '\.'
  done
  local cols
  cols="$(local_psql -At -c "select string_agg(quote_ident(column_name), ',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='works'")"
  local set
  set="$(local_psql -At -c "select string_agg(quote_ident(column_name) || '=excluded.' || quote_ident(column_name), ',') from information_schema.columns where table_schema='public' and table_name='works' and column_name not in ('id','created_at')")"
  cat <<SQL
insert into works ($cols) select $cols from s_works
  on conflict (id) do update set $set;
insert into work_links select * from s_work_links on conflict do nothing;
delete from availability where work_id in (select id from s_works);
insert into availability select * from s_availability;
commit;
SQL
}

if [[ "$MODE" == "everything" ]]; then
  TABLES=("${CATALOGUE[@]}" "${USER_DATA[@]}")
  if [[ "$YES" != "yes" ]]; then
    read -r -p "This REPLACES hosted profiles, events and imports with your local copy. Continue? [y/N] " answer
    [[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "aborted"; exit 1; }
  fi
  DUMP="data/exports/supabase-push-$(date +%Y%m%d-%H%M%S).sql"
  mkdir -p data/exports
  echo "→ dumping local data (${TABLES[*]})"
  docker exec canopy-pg pg_dump -U postgres -d canopy --data-only --no-owner --no-privileges \
    $(printf -- '--table=public.%s ' "${TABLES[@]}") > "$DUMP"
  echo "→ replacing Supabase data (one transaction)"
  {
    echo "begin;"
    echo "truncate $(IFS=,; echo "${TABLES[*]}") restart identity cascade;"
    cat "$DUMP"
    echo "commit;"
  } | remote_psql >/dev/null   # silence the dump's setval() result rows
else
  echo "→ merging catalogue into Supabase (one transaction; user data untouched)"
  merge_catalogue | remote_psql >/dev/null
fi

sql="$(count_sql "${CATALOGUE[@]}")"
echo "→ catalogue rows (local | supabase)"
paste <(local_psql -At -F' ' -c "$sql") <(remote_psql -At -F' ' -c "$sql") \
  | awk '{ printf "  %-14s %7s | %-7s %s\n", $1, $2, $4, ($2==$4 ? "ok" : "differs") }'
echo "→ user data on Supabase"
remote_psql -At -F' ' -c "$(count_sql "${USER_DATA[@]}")" | awk '{ printf "  %-14s %7s\n", $1, $2 }'
echo "→ supabase size: $(remote_psql -At -c "select pg_size_pretty(pg_database_size(current_database()))")"
