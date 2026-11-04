#!/usr/bin/env bash
# One-time hosted setup for the steps that need YOUR sign-in or a secret. Run from the repo root:
#
#     bash scripts/deploy_setup.sh
#
# What it does (and skips anything already done, so it's safe to re-run):
#   1. Signs you in to Vercel if needed (opens the browser once).
#   2. Creates the Supabase project "rhorverse" in Mumbai with a random DB password, waits for it,
#      and writes SUPABASE_DB_URL (session pooler) + SUPABASE_API_URL (transaction pooler) to .env.
#   3. Creates the Vercel projects rhorverse-api and rhorverse-web and sets their secret env vars
#      (DATABASE_URL, TMDB_READ_TOKEN) from .env.
#   4. Sets the GitHub Actions secret SUPABASE_DB_URL for the daily keepalive.
# It never prints a password, token or connection string.
set -euo pipefail
cd "$(dirname "$0")/.."

ORG_ID="ovrzlszmugvabhafsqwc"
NAME="rhorverse"
REGION="ap-south-1"
API_PROJECT="rhorverse-api"
WEB_PROJECT="rhorverse-web"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
env_has() { grep -q "^$1=." .env 2>/dev/null; }
env_get() { grep "^$1=" .env | tail -1 | cut -d= -f2-; }
env_set() { touch .env; sed -i '' "/^$1=/d" .env; printf '%s=%s\n' "$1" "$2" >> .env; }
for tool in vercel supabase gh jq psql openssl; do
  command -v "$tool" >/dev/null || { echo "missing $tool"; exit 1; }
done

# 1) Vercel sign-in --------------------------------------------------------------------------
say "1/4 Vercel sign-in"
if vercel whoami >/dev/null 2>&1; then
  echo "already signed in as $(vercel whoami 2>/dev/null | tail -1)"
else
  vercel login
fi

# 2) Supabase project ------------------------------------------------------------------------
say "2/4 Supabase project '$NAME' ($REGION)"
project_ref() { supabase projects list -o json 2>/dev/null | jq -r --arg n "$NAME" '(.projects? // .) | .[] | select(.name == $n) | .ref' | head -1; }
project_status() { supabase projects list -o json 2>/dev/null | jq -r --arg n "$NAME" '(.projects? // .) | .[] | select(.name == $n) | .status' | head -1; }

if env_has SUPABASE_DB_URL; then
  echo "SUPABASE_DB_URL already in .env, skipping"
else
  ref="$(project_ref)"
  if [[ -n "$ref" ]]; then
    echo "A project named '$NAME' exists but .env has no URL for it, and its password can't be recovered."
    echo "Delete it in the Supabase dashboard (or reset its DB password there) and re-run this script."
    exit 1
  fi
  pw="$(openssl rand -hex 24)"
  supabase projects create "$NAME" --org-id "$ORG_ID" --region "$REGION" --db-password "$pw" >/dev/null
  ref="$(project_ref)"
  echo "created project $ref; waiting until it's healthy (usually 1–3 min)…"
  for _ in $(seq 60); do [[ "$(project_status)" == "ACTIVE_HEALTHY" ]] && break; sleep 10; done

  # The pooler host differs per project (aws-0 or aws-1); try both until one answers.
  session=""
  for _ in $(seq 30); do
    for host in "aws-0-$REGION.pooler.supabase.com" "aws-1-$REGION.pooler.supabase.com"; do
      url="postgresql://postgres.$ref:$pw@$host:5432/postgres?sslmode=require"
      if psql "$url" -XAtqc "select 1" >/dev/null 2>&1; then session="$url"; pooler="$host"; break 2; fi
    done
    sleep 10
  done
  [[ -n "$session" ]] || { echo "couldn't reach the Supabase pooler yet; wait a minute and re-run"; exit 1; }
  env_set SUPABASE_DB_URL "$session"
  env_set SUPABASE_API_URL "postgresql://postgres.$ref:$pw@$pooler:6543/postgres?sslmode=require"
  unset pw url session
  echo "wrote SUPABASE_DB_URL and SUPABASE_API_URL to .env"
fi

# 3) Vercel projects + secret env vars -------------------------------------------------------
say "3/4 Vercel projects and secret env vars"
vercel project add "$API_PROJECT" >/dev/null 2>&1 || true
vercel project add "$WEB_PROJECT" >/dev/null 2>&1 || true
(cd services/api && vercel link --yes --project "$API_PROJECT" >/dev/null)
vercel link --yes --project "$WEB_PROJECT" >/dev/null   # web deploys from the repo root (pnpm workspace)

set_secret() { # dir name value
  (cd "$1" && printf '%s' "$3" | vercel env add "$2" production --force >/dev/null 2>&1 \
    || { vercel env rm "$2" production --yes >/dev/null 2>&1 || true; printf '%s' "$3" | vercel env add "$2" production >/dev/null; })
  echo "set $2 on $(basename "$(cd "$1" && pwd)")"
}
set_secret services/api DATABASE_URL "$(env_get SUPABASE_API_URL)"
if env_has TMDB_READ_TOKEN; then set_secret services/api TMDB_READ_TOKEN "$(env_get TMDB_READ_TOKEN)"; fi

# 4) GitHub secret for the keepalive workflow -------------------------------------------------
say "4/4 GitHub secret"
if gh repo view >/dev/null 2>&1; then
  env_get SUPABASE_DB_URL | gh secret set SUPABASE_DB_URL >/dev/null && echo "set SUPABASE_DB_URL on $(gh repo view --json nameWithOwner -q .nameWithOwner)"
else
  echo "no GitHub repo linked yet; re-run this script after the push to set the keepalive secret"
fi

say "Done. Tell Claude \"setup done\" and it will push the data and deploy."
