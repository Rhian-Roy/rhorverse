# Backlog: ready-to-run task prompts

Copy a block into `/plan-task`. Each one is scoped to a single commit series.

## 1. TMDB ingest (movies + TV + IN providers): done
- **Left:** swap the hand-trimmed fixtures for real captures; raise `--cap` when more data is needed.
- **Context:** `services/api/src/rhorverse/ingest/tmdb.py` is a stub. Use `ingest/http.py` (rate ≤ 20/s, Bearer `TMDB_READ_TOKEN`).
- **Do:** trending + popular + top_rated for movie/tv (cap N), details with `append_to_response=keywords,watch/providers`, normalise via `normalize.py`, upsert `works`, `work_links` (imdb), `availability` (region IN).
- **Accept:** `just ingest tmdb --cap 200` writes ≥200 rows. Re-run is idempotent. pytest with a recorded fixture in `tests/fixtures/tmdb/`.

## 2. Hybrid search endpoint: lexical half done
- **Left:** pass a real `query_vec` from the route. Works are embedded (`just embed`); the query needs an embedding approach that keeps torch out of the API runtime.
- **Context:** `api/search.py` returns `[]`.
- **Do:** trigram similarity on `title` ∪ cosine on `embedding` (when the query embeds), filtered by `media`.
- **Accept:** `GET /search?q=dune` returns Dune first. The web search page works in `API_MODE=live`.

## 3. Recs v1 on home: done
- **Left:** store un-likes and load button state back; cache `profiles.taste`; offline eval with `eval/metrics.py`.
- **Context:** `rec/rank.py`, `rec/mmr.py` and `rec/exclude.py` are tested. `api/recs.py` is a stub.
- **Do:** taste vector from events → candidate ANN (k=200) → score → MMR (λ=0.7) → exclude → explain → rails.
- **Accept:** A profile with 3 likes gets a home feed with ≥3 rails, none containing consumed items.

## 4. Letterboxd import: done
- **Left:** background job + `GET /imports/{id}` for exports over 150 missing films; an option to count imported history as recent; Netflix / AniList / Steam importers.
- **Do:** parse `watched.csv`/`ratings.csv` → `imports/match.py` → `events(kind='consumed', source='letterboxd')`.
- **Accept:** fixture CSV → ≥90% matched. `POST /imports/letterboxd` returns counts.

## 5. Anime (AniList): done
- **Left:** dedupe TMDB TV entries that are also AniList anime (needs an id map); search on romaji/native titles; per-media popularity percentile instead of the ÷1000 scale.

## 6. Games (RAWG first, IGDB later): code done, real run pending
- **Left:** add `RAWG_API_KEY`, run `just ingest rawg --cap 1000` + `just embed`, then check search ("hollow knight", "witcher") and a game page live. Later: IGDB (Twitch keys) for time-to-beat.
- **Accept:** ≥1000 games with a cover; game page shows platforms, tags, avg playtime and an active RAWG link.

## 7. Music (Apple iTunes): done
- **Left:** album artwork in DetailHeader; artist pages as their own works; Last.fm tags (needs `LASTFM_API_KEY`) to give albums richer vibe text; music in the live Music tab (Day 6).

## 8. Day 6 UI: media tabs done
- **Left:** chip bars on tabs (languages for movies/TV, formats for anime, platforms for games); Profile page (facet bars, consumed counts, "Not interested" list, TV-mode and theme toggles); "Seen it" / "Not interested" actions on tiles; the keyboard-only walkthrough e2e (`keyboard-nav.spec.ts` is still a placeholder); screenshots + design critique.

## 9. Deploy (Day 8): done
- **Left:** connect the GitHub repo to both Vercel projects for auto-deploys on push; re-push data after new ingests (`just push-supabase`); Day 9 polish (Lighthouse, keyboard/TV pass on the deployed URL).

## 10. Understory look: done. Next, the UX pieces from section 7.4
- **Do:** hero "why" line from the API ("Because you liked X"); "Top 10 in India" and "Continue" rails; detail sections "Why it's here for you" and "Across media", cast row, up-next column; language and "Available in India / Free / Under 2 h" chips; Profile page (ranked taste bars, consumed counts, "Not interested", export, TV toggle); spatial-nav walkthrough e2e; TV type scale and overscan.

