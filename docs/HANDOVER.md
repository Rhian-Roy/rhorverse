# Handover

## Current state (2026-11-06)
- **Accounts (2026-11-06):** Supabase Auth with email + password and Google (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/onboarding`, `/account`, `/privacy`), built from the Accounts page of the design canvas. Migration 0004 adds `profiles.user_id`, `age_confirmed`, `consent_at` and RLS. The API verifies Supabase tokens (`auth.py`, PyJWT, cached JWKS) and maps `sub` to a profile; a token always wins over a client-sent `profile_id`; guests still work via the cookie. After sign-in the guest profile is merged into the account and a toast says so. Export (JSON), password change, sign out everywhere and delete account (server action + secret key) are on `/account`. Env var names are in `.env.example`; the manual dashboard steps are in `docs/DEPLOY.md` › Accounts.
- Not applied to Supabase yet: run `just push-supabase`, then `db/checks/rls.sql`, then set the env vars (see DEPLOY).

- Monorepo skeleton in place: web (Next.js 16.4), api (FastAPI, uv), tokens, db migrations, scripts, docs, CI.
- Web runs fully in `API_MODE=snapshot` from placeholder JSON in `apps/web/public/snapshots/`.
- `/search`, `/works`, `/works/{id}` (with IN availability), `POST /events`, `/recs/home` and `/recs/because/{id}` are real. `POST /imports/letterboxd` is real. `GET /profile` and the other importers still return stub data with correct shapes. Search tile → detail page works in `API_MODE=live`. `/health` is real (`?deep=true` pings the DB).
- Real logic so far: `ingest/http.py`, `rec/rank.py`, `rec/mmr.py`, `rec/exclude.py`, `imports/match.py`, `eval/metrics.py`, `ingest/store.py` (upserts) and `ingest/tmdb.py` (movies + TV + IN providers), `ingest/anilist.py` (anime, no spoiler tags), `ingest/itunes.py` (music albums: India chart + seed artists), `ingest/rawg.py` (games; built and fixture-tested, **not yet run**: needs `RAWG_API_KEY`), `rec/fuse.py` (RRF), `api/search.py` (trigram + prefix + popularity), `rec/embed.py` (local MiniLM job), and `rec/feed.py` (home feed).
- Home feed (`rec/feed.py`): time-decayed taste vector from events → HNSW candidates (k=200) → `rank.score` → MMR (λ=0.7) → exclude liked/consumed/disliked → "Picked for you", up to 3 "More like X" rails (explained as "Because you liked X"), then "Popular movies" / "Popular TV". With no profile or no signal it is the popular rails only (cold start). Rails never repeat an item; personal rails under 4 items are dropped.
- Letterboxd import (`imports/run.py`): the CSV (watched, ratings or diary) is the raw request body. Films are matched to `works` (trigram-narrowed, then `match.best_match`); missing ones are fetched from TMDB (`tmdb.search_movie` + `fetch_movies`, capped at 150 lookups per import). Every match → `consumed`, 4★+ → also `like`, ≤1.5★ → also `dislike`, all with `source='letterboxd'` and the watch date as `ts`. Re-importing adds nothing. Each run is logged in `imports`.
- Media tabs (`rec/tabs.py`, `GET /recs/media/{media}`): Picked for you (taste vector, ANN restricted to that medium), Popular, New releases and up to four genre rails, excluding liked/consumed/disliked items and never repeating an item. Rendered by the shared `components/shell/MediaTab.tsx`; an empty tab (Games, until RAWG is ingested) says so.
- Vector search widens `hnsw.ef_search` to k and enables iterative scan per query. Before that, pgvector's default capped every candidate search at 40 rows.
- Music: album pages list tracks from `GET /works/{id}/tracks` (Apple lookup at request time, cached a day) and play 30-s previews in the persistent MiniPlayer. Search also matches an album's artist, and a whole-title match beats a longer title ("Interstellar" the film before its soundtrack).
- Attribution: detail pages link to the work on its source (`WorkDetail.source_url`: View on TMDB / AniList / RAWG) and a footer on every page has active credit links (RAWG requires one wherever its data shows). RAWG images are requested resized from its CDN (`/media/resize/<w>/-/…`).
- Web (live mode): "Loved it" / "Not for me" / "Save for later" on detail pages post `like` / `dislike` / `save` events for the `rhorverse_pid` cookie profile; the home page sends that id and skips the fetch cache. Snapshot mode hides the buttons.
- Migrations 0001–0003 are applied to `canopy-pg`. `works` holds 1,214 titles, all embedded: 200 TMDB from `just ingest tmdb --cap 200` (100 movies, 100 TV; 119 with IN providers), 14 movies fetched by a Letterboxd test import, 1,000 anime from `just ingest anilist --cap 1000` (28 s, no 429s; MAL ids in `work_links`), and 1,500 music albums from `just ingest itunes --cap 1500` (135 s; 492 artists, India chart first). 2,714 works in all.

- **Deployed (2026-11-04):** web https://rhorverse-web.vercel.app, API https://rhorverse-api.vercel.app (Vercel, Mumbai), DB Supabase `rhorverse` (ap-south-1, a full copy of the local data, 28 MB). Code is public at https://github.com/Rhian-Roy/rhorverse with CI (lint, tests, gitleaks) green and a daily keepalive. See `docs/DEPLOY.md`.

- **Design:** the plan's green Understory look is in (ADR-010, `docs/DESIGN.md`): palette, fonts, shapes, focus spec, hero with backdrop, editorial detail header, light theme with toggle. `/dev/tokens` shows every colour (dev only).

- **Screens (section 7.4):** data-derived hero lines, the plan's home rails, detail sections (why, cast, across media, up next), search filters and grouping, tab heroes and chips, a real Profile page, TV mode with rail-to-rail keys.

- **Performance (2026-11-06, live, desktop):** Lighthouse accessibility, best practices and SEO are 100 on Home, a title page and the Anime tab. Observed (unthrottled) LCP is 0.4 to 0.6 s, CLS 0 to 0.02, TBT 0. Lighthouse's simulated-slow-network score is 68 / 77 / 72 because Home and tabs load many AniList PNG covers (~175 KB each even at the smaller size). Fixing that needs Vercel's image optimizer (1,000-source quota on Hobby), which the plan avoids.

## How to run
See README → "Run it". In short: `.env` → `docker compose up -d db` → `just setup` → `just migrate` → `just dev`.

After an ingest or a Letterboxd import, run `just embed` (installs the local-only `ml` group the first time, then embeds only works whose `embedding` is null). Recs need it; without embeddings the home feed is popular rails only.

## Known issues
- **Accounts e2e needs a Supabase project.** `tests/e2e/accounts.spec.ts` skips unless `E2E_ACCOUNTS=1` and the Supabase URL, public key and secret key are in the environment (it creates and deletes throwaway users). The Seen it → sign out → other browser path was checked by hand against a local stand-in for Supabase Auth plus the real API and Postgres, not in CI.
- Sign-up reveals whether an email already has an account (the design asks for that message). Supabase's own default is to hide it.
- Access tokens last an hour, so a signed-out or deleted user's old token still verifies until it expires (a deleted user can no longer create a profile: the API answers 401).
- Account page: no photo upload (initials only), no device list (Supabase has no session list API), imports are listed read-only. Netflix, AniList and Steam importers are still stubs.
- The local `auth` schema is a stub created by migration 0004 on plain Postgres; Supabase's real one is used there.
- Provider logos in `apps/web/public/attribution/` must be downloaded manually (see its README).
- **Games aren't in the DB yet.** Add `RAWG_API_KEY` to `.env`, then `just ingest rawg --cap 1000` (about 1,025 requests, ~9 min at 2/s; cached after) and `just embed`. The Popular games rail appears once rows exist.
- Music seed list (`services/api/src/rhorverse/ingest/seeds/music_artists.txt`) is consumed in order until the cap; at 1,500 the last few global artists (Pink Floyd, Queen, The Beatles) don't make it. Raise `--cap` or reorder the list.
- The first web deployment uploaded the root `.env` and `.env.rtf` as (owner-only) source because `.vercelignore` didn't list them yet. Fixed for every later deployment, and that first deployment was deleted on 2026-11-04. Rotating the DB password and TMDB token is optional extra caution.
- Supabase `mildred-job-search` was paused to free a free-tier slot; restore it from the dashboard within 90 days if needed.
- Ingesters still stubbed: IGDB, Deezer (unavailable from India, ADR-007), iTunes, Last.fm, MusicBrainz. Importers still stubbed: Netflix, AniList user lists, Steam.
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
- Seen it / Not interested can't be undone from the UI (there's no delete-event endpoint). A mis-click needs a DB edit.
- Taste is computed per request (`profiles.taste` is unused). Fine at 200 works.
- With 200 works, rails can feel loosely related (MiniLM on short TMDB text). Checked live: 3 likes → "Picked for you", 3 × "More like X" and both popular rails, 20 items each, none liked.
- Port 8000 may be taken by another local server; run uvicorn on another port and set `NEXT_PUBLIC_API_BASE` to match.

## Changelog
- **2026-11-01**: Initial scaffold: root config + agent rules, Understory tokens, web shell, API skeleton, DB schema, docs, CI.

- **2026-11-02**: Migrations applied to canopy-pg. Added `ingest/store.py` and a real `ingest/tmdb.py` with fixtures and tests.
- **2026-11-02**: Search endpoint (trigram + prefix + popularity, optional vector fusion), search e2e in snapshot mode.
- **2026-11-02**: Real `/works` and `/works/{id}` (ids contain a slash, so `{work_id:path}`), encoded tile links, empty `CORS_ORIGINS=` now falls back to the default.
- **2026-11-02**: Recs v1: `just embed` implemented, `POST /events` stores events, home feed and `/recs/because` are real, detail-page feedback buttons in live mode.
- **2026-11-02**: Letterboxd import: CSV parser, TMDB search/fetch for missing films, `POST /imports/letterboxd`, upload dialog with counts. Checked live: 15-film sample → 14 matched (all fetched from TMDB), 11 likes, 1 dislike; re-import added nothing.
- **2026-11-04**: AniList anime ingest (1,000 titles, spoiler tags never stored, checked against 1,267 live spoiler tags), Popular anime rail on the home feed, build-plan Markdown committed.
- **2026-11-04**: RAWG games ingester (adult-tagged games skipped, English tags only, platforms / playtime / metacritic facets), `source_url` backlinks, site-wide credit footer, landscape tile fallback, Popular games rail. Real run pending the RAWG key.
- **2026-11-04**: Music via Apple iTunes (ADR-007): 1,500 albums, album tracks with live 30-s previews, artist-aware search, whole-title search bonus, karaoke/tribute records skipped, Popular music rail, Apple credits.
- **2026-11-04**: Live media tabs (per-media rails, shared MediaTab, tab e2e). Fixed HNSW capping candidates at 40.
- **2026-11-04**: Deployed: Supabase (all tables, row counts match), API and web on Vercel in Mumbai, public GitHub repo with CI and keepalive green. Snapshot fallback on API timeout/errors, real snapshots, pooler-safe DB connections, fixed the invalid refresh workflow.
- **2026-11-05**: Understory look replaces the scaffold's palette: green tokens with a contrast check, three plan fonts, hero/nav/focus per spec, light theme, phone nav on its own row, detail Overview below the header, album art in the header, TMDB images capped at w1280.
- **2026-11-05**: Section 7.4: hero why-lines, planned home rails, /recs/why and /recs/across, detail sections, search filters and grouping, tab chips and hero, Profile page with export, TV mode. `just push-supabase` now merges the catalogue instead of wiping hosted events. TMDB ingest is India-aware, with cast.
- **2026-11-06**: Seen it / Not interested on tiles (hover/focus buttons, S/X keys, fade-out), media() validates payload shape and falls back to snapshots, image loader right-sizes AniList and Apple art, LCP image prioritised, branded error page, skip link, Lighthouse and live keyboard/TV checks.
- **2026-11-06**: Accounts: migration 0004 (RLS), API token verification and guest merge, `/sign-in` … `/account` pages, account menu in the TopNav, pytest for tokens/identity/merge/delete, Playwright account flow (opt-in).
