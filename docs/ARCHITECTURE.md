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
  USER -. sign-in .-> AUTH[Supabase Auth]
  AUTH -. JWKS .-> API
```

## Data flow
1. **Ingest** (local, capped): each source client fetches through `ingest/http.py`. `normalize.py` maps the payload to a `works` row plus `vibe_text`, then upserts it with `work_links` and `availability`.
2. **Embed** (local): `just embed` encodes `vibe_text` → `works.embedding vector(384)`.
3. **Profile**: a guest gets an anonymous `rhorverse_pid` cookie; a signed-in user has a Supabase Auth account. Likes, saves and imports become `events` on a `profiles` row (`user_id` NULL for a guest, set for an account). `rec/profile.py` builds a taste vector.
   - **Accounts**: the web app signs in with Supabase (`@supabase/ssr`, session cookies refreshed in `proxy.ts`) and sends the access token as `Authorization: Bearer`. The API (`auth.py`) verifies it against the project's JWKS (ES256, issuer and audience checked) and maps `sub` to the user's profile. With a valid token a client-sent `profile_id` is ignored. A bad or expired token is a 401, never a silent guest.
   - **Guest merge**: `/auth/callback` calls `POST /account/merge` once after sign-in, moving the cookie profile's events and imports into the account (deduplicated) and clearing the cookie.
   - **RLS** (migration 0004) is on `profiles`, `events` and `imports`. The API connects as the table owner and bypasses it, so ownership there is enforced in code; RLS stops a Supabase client from reading or writing other users' rows. `db/checks/rls.sql` proves it.
   - **Delete account**: a Next server action calls `DELETE /account`, then removes the auth user with the secret key (server only).
4. **Recommend**: ANN candidates (HNSW cosine) → `rank.score` (similarity · popularity · freshness) → `mmr` for diversity → `exclude` consumed items → `explain` templates → rails.
5. **Serve**: Next.js server components call `lib/api.ts`. In snapshot mode they read JSON instead.
6. **Deploy**: Supabase (DB and Auth; catalogue via `scripts/push_to_supabase.sh`), Vercel (API and web, see `docs/DEPLOY.md`). `keepalive.yml` pings the DB daily.
