# Architecture

```mermaid
flowchart LR
  subgraph Sources
    TMDB & AniList & IGDB & RAWG & Deezer & iTunes & MusicBrainz & LastFM[Last.fm]
  end
  subgraph Local["Dev machine"]
    ING[ingest/*.py<br/>http.py: rate limit · retry · cache] --> NORM[normalize.py<br/>works rows + vibe text]
    EMB[rec/embed.py<br/>MiniLM on MPS]
  end
  Sources --> ING
  NORM --> PG[(Postgres<br/>pgvector · pg_trgm)]
  EMB --> PG
  PG --> API[FastAPI<br/>works · search · recs · profile · imports]
  API --> WEB[Next.js 16<br/>App Router]
  PG -. export_snapshot.py .-> SNAP[/public/snapshots/*.json/]
  SNAP -. API_MODE=snapshot .-> WEB
  USER((User)) --> WEB
  WEB -- events --> API
```

## Data flow
1. **Ingest** (local, capped): each source client fetches through `ingest/http.py`. `normalize.py` maps the payload to a `works` row plus `vibe_text`, then upserts it with `work_links` and `availability`.
2. **Embed** (local): `just embed` encodes `vibe_text` → `works.embedding vector(384)`.
3. **Profile**: the browser gets an anonymous `rhorverse_pid` cookie. Likes, saves and imports become `events`. `rec/profile.py` builds a taste vector.
4. **Recommend**: ANN candidates (HNSW cosine) → `rank.score` (similarity · popularity · freshness) → `mmr` for diversity → `exclude` consumed items → `explain` templates → rails.
5. **Serve**: Next.js server components call `lib/api.ts`. In snapshot mode they read JSON instead.
6. **Deploy** (Dec 2026): Supabase (DB, via `scripts/push_to_supabase.sh`), Render (API Dockerfile), Vercel (web). `keepalive.yml` pings the DB daily.
