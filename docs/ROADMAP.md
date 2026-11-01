# Roadmap

| When | Milestone | Done when |
|---|---|---|
| **Nov 2026 · wk 1** | Skeleton | `just setup/migrate/test/lint/dev` green ✅ |
| Nov 2026 · wk 2 | Movies & TV ingest | TMDB → `works` (≥2k rows) + IN watch providers |
| Nov 2026 · wk 2 | CI (Day 8) | `ci.yml` green on every push |
| Nov 2026 · wk 3 | Anime + games ingest | AniList, IGDB (+RAWG fallback) normalised |
| Nov 2026 · wk 4 | Music ingest | Deezer charts/previews, iTunes IN, MusicBrainz IDs, Last.fm tags |
| Dec 2026 · wk 1 | Embeddings + search | Local MiniLM → pgvector; trigram + vector hybrid search |
| Dec 2026 · wk 2 | Recs v1 | Taste vector, rank, MMR, exclusion, explanations on home |
| Dec 2026 · wk 3 | Imports | Netflix, Letterboxd, AniList user, Steam → events + exclusions |
| Dec 2026 · wk 4 | Deploy | Supabase DB, Render API, Vercel web; keepalive cron |
| Jan 2027 | Eval + polish | NDCG@10 offline eval, TV mode pass, accessibility audit |
| 2027+ | Stretch | LLM facet extraction, books/podcasts, shared lists |
