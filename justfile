# Rhorverse — one-word commands. `just --list` to see them all.
set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]

api := "services/api"

default:
    @just --list

# Install all deps (pnpm, uv, Playwright browser) and generate tokens
setup:
    pnpm install
    pnpm --filter @rhorverse/tokens build
    uv sync --project {{api}}
    pnpm --filter web exec playwright install chromium
    mkdir -p data/cache data/exports data/imports

# Run web (:3000) and api (:8000) together
dev:
    pnpm exec concurrently -k -n web,api -c auto \
      "pnpm --filter web dev" \
      "uv run --project {{api}} uvicorn rhorverse.main:app --reload --port 8000 --app-dir {{api}}/src"

# All tests (api pytest + web typecheck + Playwright)
test: test-api test-web

test-api:
    uv run --project {{api}} pytest {{api}}/tests -q

test-web:
    pnpm --filter web typecheck
    pnpm --filter web test:e2e

# Lint web (eslint) and api (ruff)
lint:
    pnpm --filter web lint
    uv run --project {{api}} ruff check {{api}}
    uv run --project {{api}} ruff format --check {{api}}

# Apply SQL migrations in db/migrations to $DATABASE_URL
migrate:
    db/migrate.sh

# Run one ingester, e.g. `just ingest tmdb`
ingest source:
    uv run --project {{api}} python -m rhorverse.ingest.{{source}}

# Compute embeddings locally (installs the optional ml group)
embed:
    scripts/embed_all.sh

# Export precomputed JSON into apps/web/public/snapshots
snapshot:
    uv run --project {{api}} python scripts/export_snapshot.py
