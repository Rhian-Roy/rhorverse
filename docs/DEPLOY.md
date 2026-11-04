# Deploy runbook

Everything runs on free tiers. Ingestion and embeddings stay on your Mac; the cloud only serves.

| Piece | Where | Notes |
|---|---|---|
| Web (Next.js) | Vercel project `rhorverse-web`, built from the repo root (pnpm workspace, root dir `apps/web`) | `API_MODE=live`, `NEXT_PUBLIC_API_BASE` = the API URL. Falls back to snapshot JSON if the API is slow (>8 s) or down. |
| API (FastAPI) | Vercel project `rhorverse-api`, deployed from `services/api` (`index.py`), region `bom1` (Mumbai) | `DATABASE_URL` = Supabase **transaction** pooler (port 6543), `CORS_ORIGINS`, `DATA_DIR=/tmp/rhorverse`, optional `TMDB_READ_TOKEN`. |
| Database | Supabase project `rhorverse`, `ap-south-1` | Postgres 17 + pgvector + pg_trgm. Pauses after a week idle; `.github/workflows/keepalive.yml` pings it daily. |
| Code | GitHub (public) | CI runs lint, tests and gitleaks on every push. |

## First-time setup
1. `bash scripts/deploy_setup.sh` (you): Vercel sign-in, Supabase project, secrets into `.env`, Vercel and GitHub secrets.
2. `just push-supabase`: migrations + all local rows into Supabase, with row counts on both sides.
3. Set the non-secret Vercel env vars and `vercel deploy --prod` (API from `services/api`, web from the repo root).

## Day-to-day
- **New data** (after an ingest + `just embed` locally): `just push-supabase`, then `just snapshot` and commit the snapshots.
- **New code**: push to GitHub, then `vercel deploy --prod` in `services/api` and at the repo root.
- **Roll back**: `vercel rollback` in the project's directory, or promote an earlier deployment in the Vercel dashboard.

## Limits to remember
- Vercel Hobby is non-commercial only. Functions are pinned to Mumbai to sit next to the DB.
- Supabase free: 500 MB DB (we use about 25 MB), 2 active projects per org. `mildred-job-search` was paused on 2026-11-04 to make room; restore it from the Supabase dashboard (free projects stay restorable for 90 days).
- The hosted DB holds a copy of everything local, including your profiles, events and imports.
