# Handover

## Current state (2026-11-02)
- Monorepo skeleton in place: web (Next.js 16.4), api (FastAPI, uv), tokens, db migrations, scripts, docs, CI.
- Web runs fully in `API_MODE=snapshot` from placeholder JSON in `apps/web/public/snapshots/`.
- `/search`, `/works`, `/works/{id}` (with IN availability), `POST /events`, `/recs/home` and `/recs/because/{id}` are real. `POST /imports/letterboxd` is real. `GET /profile` and the other importers still return stub data with correct shapes. Search tile → detail page works in `API_MODE=live`. `/health` is real (`?deep=true` pings the DB).
- Real logic so far: `ingest/http.py`, `rec/rank.py`, `rec/mmr.py`, `rec/exclude.py`, `imports/match.py`, `eval/metrics.py`, `ingest/store.py` (upserts) and `ingest/tmdb.py` (movies + TV + IN providers), `ingest/anilist.py` (anime, no spoiler tags), `ingest/rawg.py` (games; built and fixture-tested, **not yet run**: needs `RAWG_API_KEY`), `rec/fuse.py` (RRF), `api/search.py` (trigram + prefix + popularity), `rec/embed.py` (local MiniLM job), and `rec/feed.py` (home feed).
- Home feed (`rec/feed.py`): time-decayed taste vector from events → HNSW candidates (k=200) → `rank.score` → MMR (λ=0.7) → exclude liked/consumed/disliked → "Picked for you", up to 3 "More like X" rails (explained as "Because you liked X"), then "Popular movies" / "Popular TV". With no profile or no signal it is the popular rails only (cold start). Rails never repeat an item; personal rails under 4 items are dropped.
- Letterboxd import (`imports/run.py`): the CSV (watched, ratings or diary) is the raw request body. Films are matched to `works` (trigram-narrowed, then `match.best_match`); missing ones are fetched from TMDB (`tmdb.search_movie` + `fetch_movies`, capped at 150 lookups per import). Every match → `consumed`, 4★+ → also `like`, ≤1.5★ → also `dislike`, all with `source='letterboxd'` and the watch date as `ts`. Re-importing adds nothing. Each run is logged in `imports`.
- Attribution: detail pages link to the work on its source (`WorkDetail.source_url`: View on TMDB / AniList / RAWG) and a footer on every page has active credit links (RAWG requires one wherever its data shows). RAWG images are requested resized from its CDN (`/media/resize/<w>/-/…`).
- Web (live mode): "Loved it" / "Not for me" / "Save for later" on detail pages post `like` / `dislike` / `save` events for the `rhorverse_pid` cookie profile; the home page sends that id and skips the fetch cache. Snapshot mode hides the buttons.
- Migrations 0001–0003 are applied to `canopy-pg`. `works` holds 1,214 titles, all embedded: 200 TMDB from `just ingest tmdb --cap 200` (100 movies, 100 TV; 119 with IN providers), 14 movies fetched by a Letterboxd test import, and 1,000 anime from `just ingest anilist --cap 1000` (28 s, no 429s; MAL ids in `work_links`).

## How to run
See README → "Run it". In short: `.env` → `docker compose up -d db` → `just setup` → `just migrate` → `just dev`.

After an ingest or a Letterboxd import, run `just embed` (installs the local-only `ml` group the first time, then embeds only works whose `embedding` is null). Recs need it; without embeddings the home feed is popular rails only.

## Known issues
- Provider logos in `apps/web/public/attribution/` must be downloaded manually (see its README).
- **Games aren't in the DB yet.** Add `RAWG_API_KEY` to `.env`, then `just ingest rawg --cap 1000` (about 1,025 requests, ~9 min at 2/s; cached after) and `just embed`. The Popular games rail appears once rows exist.
- Ingesters still stubbed: IGDB, Deezer, iTunes, Last.fm, MusicBrainz. Importers still stubbed: Netflix, AniList user lists, Steam.
- Same show from two sources: TMDB TV includes some anime (e.g. One Piece, Bleach), so search and rails can show both the TMDB and the AniList entry. Needs a TMDB ↔ AniList id map to dedupe.
- Search matches the stored title only (English when AniList has one). Romaji/native titles sit in `facets` but aren't searched.
- AniList popularity is scaled ÷1000 to sit near TMDB's. A per-media percentile would be fairer.
- TMDB test fixtures are hand-trimmed, not live recordings. `tests/test_store.py` skips when the DB is unreachable.
- `apps/web/AGENTS.md` is written by `next dev` itself. Keep it committed.
- Starlette warns that `httpx` in `TestClient` is deprecated. Harmless for now.

- Search is lexical only for now: the vector half (`search_works(query_vec=...)`) is built and fused with RRF but dormant. Works are embedded now; it still needs a way to embed the query without torch in the API.
- Feedback v1 only records turning an action on. Un-liking resets the button but stores nothing, and the button state isn't loaded back on page visit.
- Imported films count for exclusion at once but only join the taste vector after `just embed`. Imported events carry the old watch date, so with the 90-day half-life an app like from today outweighs a year of history.
- Large Letterboxd exports: only 150 missing films are looked up per import (about 15 s). Upload again to continue; already-fetched films match locally.
- Taste is computed per request (`profiles.taste` is unused). Fine at 200 works.
- With 200 works, rails can feel loosely related (MiniLM on short TMDB text). Checked live: 3 likes → "Picked for you", 3 × "More like X" and both popular rails, 20 items each, none liked.
- Port 8000 may be taken by another local server; run uvicorn on another port and set `NEXT_PUBLIC_API_BASE` to match.
- Detail pages: `TagCloud` shows keywords twice (from `facets` and from the flat `tags` list). Cosmetic.
- `GET /works?media=..&rails=1` is called by `api.media()` in the web app, but the endpoint returns a flat `Work[]`, not `Rail[]`. Needs reconciling when the media tabs go live.

## Changelog
- **2026-11-01**: Initial scaffold: root config + agent rules, Understory tokens, web shell, API skeleton, DB schema, docs, CI.

- **2026-11-02**: Migrations applied to canopy-pg. Added `ingest/store.py` and a real `ingest/tmdb.py` with fixtures and tests.
- **2026-11-02**: Search endpoint (trigram + prefix + popularity, optional vector fusion), search e2e in snapshot mode.
- **2026-11-02**: Real `/works` and `/works/{id}` (ids contain a slash, so `{work_id:path}`), encoded tile links, empty `CORS_ORIGINS=` now falls back to the default.
- **2026-11-02**: Recs v1: `just embed` implemented, `POST /events` stores events, home feed and `/recs/because` are real, detail-page feedback buttons in live mode.
- **2026-11-02**: Letterboxd import: CSV parser, TMDB search/fetch for missing films, `POST /imports/letterboxd`, upload dialog with counts. Checked live: 15-film sample → 14 matched (all fetched from TMDB), 11 likes, 1 dislike; re-import added nothing.
- **2026-11-04**: AniList anime ingest (1,000 titles, spoiler tags never stored, checked against 1,267 live spoiler tags), Popular anime rail on the home feed, build-plan Markdown committed.
- **2026-11-04**: RAWG games ingester (adult-tagged games skipped, English tags only, platforms / playtime / metacritic facets), `source_url` backlinks, site-wide credit footer, landscape tile fallback, Popular games rail. Real run pending the RAWG key.
