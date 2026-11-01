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
