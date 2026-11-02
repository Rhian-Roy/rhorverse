# Backlog: ready-to-run task prompts

Copy a block into `/plan-task`. Each one is scoped to a single commit series.

## 1. TMDB ingest (movies + TV + IN providers): done
- **Left:** swap the hand-trimmed fixtures for real captures; raise `--cap` when more data is needed.
- **Context:** `services/api/src/rhorverse/ingest/tmdb.py` is a stub. Use `ingest/http.py` (rate ≤ 20/s, Bearer `TMDB_READ_TOKEN`).
- **Do:** trending + popular + top_rated for movie/tv (cap N), details with `append_to_response=keywords,watch/providers`, normalise via `normalize.py`, upsert `works`, `work_links` (imdb), `availability` (region IN).
- **Accept:** `just ingest tmdb --cap 200` writes ≥200 rows. Re-run is idempotent. pytest with a recorded fixture in `tests/fixtures/tmdb/`.

## 2. Hybrid search endpoint: lexical half done
- **Left:** implement `rec/embed.py`, run `just embed`, and pass a real `query_vec` from the route (needs a query-embedding approach that keeps torch out of the API runtime).
- **Context:** `api/search.py` returns `[]`.
- **Do:** trigram similarity on `title` ∪ cosine on `embedding` (when the query embeds), filtered by `media`.
- **Accept:** `GET /search?q=dune` returns Dune first. The web search page works in `API_MODE=live`.

## 2b. Real `/works/{id}` (small)
- **Do:** query `works` (+ `availability`, `work_links`), use a `{work_id:path}` route since ids contain `/`, reuse `repo.row_to_work`.
- **Accept:** a search tile opens its detail page in `API_MODE=live` with IN providers and the JustWatch credit.

## 3. Recs v1 on home
- **Context:** `rec/rank.py`, `rec/mmr.py` and `rec/exclude.py` are tested. `api/recs.py` is a stub.
- **Do:** taste vector from events → candidate ANN (k=200) → score → MMR (λ=0.7) → exclude → explain → rails.
- **Accept:** A profile with 3 likes gets a home feed with ≥3 rails, none containing consumed items.

## 4. Letterboxd import
- **Do:** parse `watched.csv`/`ratings.csv` → `imports/match.py` → `events(kind='consumed', source='letterboxd')`.
- **Accept:** fixture CSV → ≥90% matched. `POST /imports/letterboxd` returns counts.
