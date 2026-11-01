# Data sources

Verify each provider's current terms before going live. Limits change. All requests go through `rhorverse.ingest.http` (rate limit, backoff, disk cache in `data/cache/<source>`, descriptive User-Agent).

| Source | Used for | Endpoint(s) | Auth (env) | Limit we use | Attribution / terms |
|---|---|---|---|---|---|
| **TMDB** | Movies, TV, images, IN watch providers | `api.themoviedb.org/3` (`/trending`, `/movie/{id}`, `/tv/{id}`, `/watch/providers`) | `TMDB_READ_TOKEN` (v4 Bearer) | 20 req/s | Logo + "This product uses the TMDB API but is not endorsed or certified by TMDB." Non-commercial use. |
| **JustWatch** (via TMDB) | Where to watch (region IN) | via TMDB `watch/providers` | — | — | Must credit JustWatch wherever availability is shown. |
| **AniList** | Anime | `graphql.anilist.co` | none | 0.5 req/s (limit 90/min, sometimes degraded to 30) | Credit AniList. No bulk redistribution. |
| **IGDB** | Games | `api.igdb.com/v4` (Apicalypse POST bodies) | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` (client-credentials token) | 4 req/s | Twitch Developer Agreement. Credit IGDB. |
| **RAWG** | Games fallback/enrichment | `api.rawg.io/api` | `RAWG_API_KEY` | 2 req/s, mind the monthly quota | Must link back to RAWG on pages using its data. |
| **Deezer** | Charts, artists, albums, 30-s previews | `api.deezer.com` | none | 8 req/s (limit 50 / 5 s) | Credit Deezer. Previews only, no full tracks. |
| **Apple iTunes Search** | India catalogue, previews | `itunes.apple.com/search?country=IN` | none | ~20 req/min | Previews must link to Apple. No caching of audio. |
| **MusicBrainz** | MBIDs, ISRC links | `musicbrainz.org/ws/2` | `MUSICBRAINZ_USER_AGENT` (required, with contact) | **1 req/s** strictly | Data CC0. Descriptive UA is mandatory. |
| **Last.fm** | Tags, similar artists | `ws.audioscrobbler.com/2.0` | `LASTFM_API_KEY` | 4 req/s | Credit Last.fm and link back. |
| **Steam Web API** | User library import | `api.steampowered.com/IPlayerService/GetOwnedGames/v1` | `STEAM_WEB_API_KEY` | on-demand | Steam Web API Terms. Public profiles only. |
| **Gemini** (optional) | LLM facet extraction | Google AI Studio API | `GEMINI_API_KEY` | batch, low volume | Only on our own derived text. |

## Storage rules
- Raw responses live only in `data/` (gitignored). Never commit provider data.
- Snapshots in `apps/web/public/snapshots/` hold only the minimal fields the UI needs.
