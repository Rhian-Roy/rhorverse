<p align="center"><img src="apps/web/public/brand/rhorverse-wordmark.svg" alt="Rhorverse" width="264"></p>

# Rhorverse

**One taste profile, every universe.** Rhorverse recommends what to watch, hear and play next across movies, TV, anime, music and games. It learns from what you already love, and it can import your history from Netflix, Letterboxd, AniList and Steam. It explains every pick ("because you liked…") and shows where to stream in India.

> Status: skeleton (Nov 2026). See [docs/ROADMAP.md](docs/ROADMAP.md).

## Screenshots
_Coming once real data lands. References and screens go in [docs/moodboard/](docs/moodboard/)._

## Architecture
```
 Browser ── Next.js 16 (apps/web) ──► FastAPI (services/api) ──► Postgres + pgvector + pg_trgm
             │  API_MODE=snapshot          │  rec: profile → rank → MMR → exclude → explain
             └► /snapshots/*.json          └► ingest: TMDB · AniList · IGDB · RAWG · Deezer · iTunes · MusicBrainz · Last.fm
```
Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Design system: [docs/DESIGN.md](docs/DESIGN.md) · Decisions: [docs/DECISIONS.md](docs/DECISIONS.md)

## Run it
Prerequisites: Node 24 + pnpm, Python 3.12 + uv, `just`, Docker.

```bash
cp .env.example .env            # fill DATABASE_URL + POSTGRES_PASSWORD at minimum
docker compose up -d db         # local Postgres + pgvector (container: canopy-pg)
just setup                      # pnpm + uv deps, tokens, Playwright browser
just migrate                    # apply db/migrations
just dev                        # web http://localhost:3000 · api http://localhost:8000/health
```

| Command | What it does |
|---|---|
| `just test` | pytest + TypeScript check + Playwright |
| `just lint` | ESLint + ruff |
| `just ingest tmdb` | Run one ingester (`anilist`, `igdb`, `rawg`, `deezer`, `itunes`, `musicbrainz`, `lastfm`) |
| `just embed` | Local embeddings (installs the optional `ml` group) |
| `just snapshot` | Export JSON so the web app runs with no backend (`API_MODE=snapshot`) |

## Repo layout
`apps/web` (Next.js) · `services/api` (FastAPI) · `packages/tokens` (design tokens) · `db/` (SQL migrations) · `scripts/` · `docs/`

## Credits
This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability by JustWatch. Data from AniList, IGDB, RAWG, Deezer, Apple iTunes, MusicBrainz (CC0), Last.fm and Steam, each under its own terms. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## License
Code: [MIT](LICENSE). Third-party data and images are not included and aren't covered by this license.
