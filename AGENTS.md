# AGENTS.md — Rhorverse

Canonical rules for every coding agent (Claude Code, Gemini/Antigravity, Codex, Cursor…).
Tool-specific files (`CLAUDE.md`, `GEMINI.md`, `.agents/rules/`) only point here or add workflow notes.

## What this is
Rhorverse is a cross-media recommender web app covering movies, TV, anime, music and games. Monorepo:

| Path | What |
|---|---|
| `apps/web` | Next.js 16 App Router, TypeScript strict, Tailwind v4 |
| `services/api` | FastAPI on Python 3.12, managed with uv (package `rhorverse`) |
| `packages/tokens` | Design tokens → generated `@theme` block |
| `db/` | Plain SQL migrations for Postgres + pgvector + pg_trgm |
| `scripts/` | Seed / embed / snapshot / deploy helpers |
| `docs/` | Handover, roadmap, decisions, design system |

## Commands (always via `just`)
`just setup` · `just dev` · `just test` · `just lint` · `just migrate` · `just ingest <source>` · `just embed` · `just snapshot`

Run `just test` and `just lint` before every commit. Both must pass.

## Hard rules
1. **Stack is locked.** Don't substitute or add frameworks. Specifically:
   - Animation: `motion` imported from `"motion/react"` (never `framer-motion`).
   - Carousels: `embla-carousel-react` v8 stable.
   - TV/spatial nav: `@noriginmedia/norigin-spatial-navigation-react`.
   - Dialogs/tabs/tooltips: Radix primitives. **No shadcn/ui.**
   - Icons: `@phosphor-icons/react`, one weight (`regular`). **No lucide-react.**
2. **Colours come only from tokens.** Never use Tailwind default palette classes (`indigo-*`, `violet-*`, `purple-*`, `slate-*`, `gray-*`, …). They're disabled by `--color-*: initial`. No raw hex in `className`. To change a colour, edit `packages/tokens/tokens.json` and run `pnpm --filter @rhorverse/tokens build`. Never hand-edit the generated region of `globals.css`.
3. **Python runtime stays light.** `torch` / `sentence-transformers` live only in the `ml` dependency group, which is used locally by `just embed`. Never add them to `[project].dependencies`.
4. **Secrets.** Never read, print or commit `.env*` (except `.env.example`) or anything under `data/`. New env vars go in `.env.example` with a comment and no value.
5. **Git.** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`). Small logical commits. **Never add a remote, never push.** The owner does that.
6. **Data sources.** Respect each provider's rate limits, terms and attribution (see `docs/DATA_SOURCES.md`). All outbound HTTP goes through `rhorverse.ingest.http`. Show credits (TMDB, JustWatch, RAWG, IGDB…) where their terms require it.
7. **Schema changes** only as a new numbered file in `db/migrations/`. Never edit an applied migration.
8. **Tests.** New logic in `rec/`, `imports/` or `ingest/` gets a pytest. New user-facing routes get a Playwright check when practical.

## Conventions
- TS: strict, no `any`, shared types in `apps/web/src/lib/types.ts` mirror `services/api/src/rhorverse/schemas.py`.
- Python: ruff (lint + format), type hints everywhere, pydantic models for every response.
- Keep the web app working in `API_MODE=snapshot` (no backend) at all times.

## Handover
At the end of a work session update `docs/HANDOVER.md` (state, how to run, known issues, changelog) and `docs/BACKLOG.md` (next tasks).
