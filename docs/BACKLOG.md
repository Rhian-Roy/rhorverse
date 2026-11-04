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
