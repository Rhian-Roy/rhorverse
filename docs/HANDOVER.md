# Handover

## Current state (2026-11-02)
- Monorepo skeleton in place: web (Next.js 16.4), api (FastAPI, uv), tokens, db migrations, scripts, docs, CI.
- Web runs fully in `API_MODE=snapshot` from placeholder JSON in `apps/web/public/snapshots/`.
- `/search`, `/works` and `/works/{id}` (with IN availability) are real. `/recs`, `/profile` and `/imports` still return stub data with correct shapes. Search tile → detail page works in `API_MODE=live`. `/health` is real (`?deep=true` pings the DB).
- Real logic so far: `ingest/http.py`, `rec/rank.py`, `rec/mmr.py`, `rec/exclude.py`, `imports/match.py`, `eval/metrics.py`, `ingest/store.py` (upserts) and `ingest/tmdb.py` (movies + TV + IN providers), `rec/fuse.py` (RRF) and `api/search.py` (trigram + prefix + popularity).
- Migrations 0001–0003 are applied to `canopy-pg`. `works` holds 200 TMDB titles (100 movies, 100 TV; 119 with IN providers) from `just ingest tmdb --cap 200`.

## How to run
See README → "Run it". In short: `.env` → `docker compose up -d db` → `just setup` → `just migrate` → `just dev`.

## Known issues
- Provider logos in `apps/web/public/attribution/` must be downloaded manually (see its README).
- All ingesters and importers except `http.py`, `tmdb.py` and `match.py` are stubs.
- TMDB test fixtures are hand-trimmed, not live recordings. `tests/test_store.py` skips when the DB is unreachable.
- `apps/web/AGENTS.md` is written by `next dev` itself. Keep it committed.
- Starlette warns that `httpx` in `TestClient` is deprecated. Harmless for now.

- Search is lexical only for now: the vector half (`search_works(query_vec=...)`) is built and fused with RRF but dormant. It needs embeddings (`just embed`, still a stub) and a way to embed the query without torch in the API.
- Detail pages: `TagCloud` shows keywords twice (from `facets` and from the flat `tags` list). Cosmetic.
- `GET /works?media=..&rails=1` is called by `api.media()` in the web app, but the endpoint returns a flat `Work[]`, not `Rail[]`. Needs reconciling when the media tabs go live.

## Changelog
- **2026-11-01**: Initial scaffold: root config + agent rules, Understory tokens, web shell, API skeleton, DB schema, docs, CI.

- **2026-11-02**: Migrations applied to canopy-pg. Added `ingest/store.py` and a real `ingest/tmdb.py` with fixtures and tests.
- **2026-11-02**: Search endpoint (trigram + prefix + popularity, optional vector fusion), search e2e in snapshot mode.
- **2026-11-02**: Real `/works` and `/works/{id}` (ids contain a slash, so `{work_id:path}`), encoded tile links, empty `CORS_ORIGINS=` now falls back to the default.
