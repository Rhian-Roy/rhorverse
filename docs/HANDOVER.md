# Handover

## Current state (2026-11-01)
- Monorepo skeleton in place: web (Next.js 16.4), api (FastAPI, uv), tokens, db migrations, scripts, docs, CI.
- Web runs fully in `API_MODE=snapshot` from placeholder JSON in `apps/web/public/snapshots/`.
- API endpoints exist with correct response shapes but return stub data. `/health` is real (`?deep=true` pings the DB).
- Real logic so far: `ingest/http.py`, `rec/rank.py`, `rec/mmr.py`, `rec/exclude.py`, `imports/match.py`, `eval/metrics.py`.

## How to run
See README → "Run it". In short: `.env` → `docker compose up -d db` → `just setup` → `just migrate` → `just dev`.

## Known issues
- Provider logos in `apps/web/public/attribution/` must be downloaded manually (see its README).
- All ingesters and importers except `http.py`/`match.py` are stubs.
- `apps/web/AGENTS.md` is written by `next dev` itself. Keep it committed.
- Starlette warns that `httpx` in `TestClient` is deprecated. Harmless for now.

## Changelog
- **2026-11-01**: Initial scaffold: root config + agent rules, Understory tokens, web shell, API skeleton, DB schema, docs, CI.
