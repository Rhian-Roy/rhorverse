#!/usr/bin/env bash
# Applies db/migrations/*.sql in filename order, each once, each in its own transaction.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is not set (copy .env.example to .env)}"
cd "$(dirname "$0")"

psql_q() { PGOPTIONS="-c client_min_messages=warning" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q "$@"; }

psql_q -c "create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);"

applied=0
for file in migrations/*.sql; do
  version="$(basename "$file" .sql)"
  if [[ "$(psql_q -tA -c "select 1 from schema_migrations where version = '$version'")" == "1" ]]; then
    continue
  fi
  echo "→ applying $version"
  { cat "$file"; echo; echo "insert into schema_migrations (version) values ('$version');"; } \
    | psql_q --single-transaction -f -
  applied=$((applied + 1))
done

echo "migrations up to date ($applied applied)"
