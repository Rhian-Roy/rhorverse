# Architecture Decision Records

Format: context → decision → consequences. Add new ADRs at the bottom. Never rewrite old ones; supersede them.

## ADR-001: Product name "Rhorverse", infra names stay "canopy"
- **Context:** The project started as "canopy". The owner chose a personal name: Rhor + universe of every medium.
- **Decision:** Rhorverse everywhere in code and brand (`rhorverse` Python package, `@rhorverse/tokens`, `rhorverse_pid` cookie). The repo folder, the `canopy-pg` container, the `canopy` database and the `canopy-pgdata` volume keep their names.
- **Consequences:** No data migration needed. Infra names look historical, and this ADR is why.

## ADR-002: Monorepo with pnpm workspaces + uv + just
- **Decision:** One repo. pnpm workspaces for JS (`apps/*`, `packages/*`), uv for Python, `just` as the single command surface.
- **Consequences:** One place for agents and humans to look. CI installs both toolchains.

## ADR-003: Next.js 16 App Router + Tailwind v4 CSS-first tokens
- **Decision:** Tailwind v4 `@theme` generated from `packages/tokens/tokens.json`, with `--color-*: initial` so only our tokens exist. Radix primitives instead of shadcn/ui. Phosphor icons in one weight. `motion/react`. Embla v8.
- **Consequences:** No accidental default palette. ESLint enforces no raw hex in `className`.

## ADR-004: Postgres + pgvector + pg_trgm, plain SQL migrations
- **Decision:** One Postgres for catalogue, vectors and events. HNSW cosine index. Fuzzy titles via trigram. Migrations are numbered `.sql` files applied by `db/migrate.sh`, with no ORM.
- **Consequences:** Runs on Supabase free tier. Schema history is easy to read.

## ADR-005: Embeddings computed locally, not at runtime
- **Decision:** sentence-transformers (MiniLM, 384-d) runs on the dev Mac (MPS) via the optional `ml` uv group. The deployed API only does vector maths with numpy and pgvector.
- **Consequences:** Small Docker image, no GPU in prod. New items need a local `just embed` (later: a weekly job).

## ADR-006: Snapshot mode for the web app
- **Decision:** `API_MODE=snapshot` reads precomputed JSON from `/snapshots`.
- **Consequences:** The web app demos and tests with no backend. Snapshots must be refreshed with `just snapshot`.

## ADR-007: Music from Apple iTunes, not Deezer
- **Context:** The build plan put Deezer first for music. Checked live from India on 2026-11-04: `/chart/0/albums` returns no albums, and tracks come back `readable: false` with empty previews (Deezer isn't offered in India). Apple's iTunes Search (`country=IN`) returns the Indian catalogue with working 30-s previews, and Apple's India top-albums feed works.
- **Decision:** Music comes from iTunes: the India top-100 albums chart plus a reviewable seed list of artists (`ingest/seeds/music_artists.txt`). Tracks and preview URLs are fetched at request time (`GET /works/{id}/tracks`, cached a day) and never stored. Deezer stays a stub.
- **Consequences:** Strong India coverage; ~20 calls/min means ~2 min for 1,500 albums. Apple gives no popularity number, so chart rank / search position stand in. Previews must link to the Apple store page, so album pages show "View on Apple Music" and the footer credits Apple.

## ADR-008: API on Vercel (Mumbai) instead of Render
- **Context:** The build plan put the API on Render's free tier, which needs a dashboard sign-up connected to GitHub. Vercel already hosts the web app, runs Python/FastAPI, and lets functions be pinned to `bom1`, next to the Supabase DB in `ap-south-1`.
- **Decision:** Deploy `services/api` as its own Vercel project (`index.py` exposes `app`). Connections go through Supabase's transaction pooler with prepared statements off. The Dockerfile stays, so Render or any container host remains an option.
- **Consequences:** One provider and one sign-in for both halves. Serverless cold starts are short, and the web app falls back to snapshots after 8 s anyway. The Apple tracks cache lives in `/tmp` and is lost between instances, which is fine.

## ADR-009: Public GitHub repo; the owner approved pushes
- **Context:** AGENTS.md rule 5 says agents never add a remote or push. On 2026-11-04 the owner approved creating a **public** repo and asked the agent to handle deployment end to end.
- **Decision:** Push to a public repo `rhorverse` after a clean gitleaks scan of the full history. Agents may push only when the owner has said so for that piece of work. The AGENTS.md wording is the owner's to update (agents can't edit their own rules file).
- **Consequences:** CI, the Supabase keepalive and the Antigravity/Jules handover all work. Commit history, including author emails, is public. The snapshot JSON publishes a small, credited sample of TMDB, AniList and Apple data.

## ADR-010: The plan's green Understory palette replaces the scaffold's "cosmic" one
- **Context:** The scaffold shipped an invented look (navy, teal, magenta gradients, Space Grotesk, Inter) while calling it Understory. The build plan's section 7 specifies a dark-green palette with exact hex values and Bricolage Grotesque, Instrument Sans and IBM Plex Mono, and names Inter and purple gradients as "looks AI-made" tells. The owner spotted the mismatch on the live site.
- **Decision:** Adopt the plan's values as written (its contrast table checks out within 0.1:1). Add the light theme it specifies. Tailwind's default radii, shadows and easings are removed as well, so only tokens exist.
- **Consequences:** `tokens.json` is the single source and a contrast check guards it in CI. Light-theme values beyond the plan's three (bg, text, accent) are our own choices, picked to pass the same contrast targets.

