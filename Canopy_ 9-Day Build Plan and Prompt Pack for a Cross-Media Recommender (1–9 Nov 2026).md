# Canopy: 9-Day Build Plan and Prompt Pack for a Cross-Media Recommender (1–9 Nov 2026)

You can realistically ship a deployed, breadth-first MVP covering movies, TV, anime, music and games by Monday 9 Nov. It will have real catalog slices, detail pages, search, one cross-media recommendation rail per medium and template "because you liked X" explanations. To get there, Claude Pro should go on architecture, scaffolding, the design system and ingestion. ML depth (EASE^R, LLM reranking, evaluation) moves to after 9 Nov, when Google AI Pro takes over through Antigravity CLI and Jules, not Gemini CLI, which stopped serving AI Pro accounts on 18 June 2026.\[1\]\[2\]

## TL;DR
- **Scope:** "Done by 9 Nov" means a deployed web app with about 7,000 seeded titles across five media, India streaming availability with JustWatch attribution, unified search, an embedding + facet + MMR recommender with a hard exclusion filter, local profiles, Netflix/Letterboxd/AniList/Steam imports, and handover docs. EASE^R, the LLM reranker, LLM explanations, real auth and evaluation come after 9 Nov.
- **Stack:** Next.js 16.4 (App Router) + Tailwind v4 with the default palette stripped, a FastAPI (uv) backend, and Postgres + pgvector. Develop locally in OrbStack/Docker; deploy to Vercel Hobby + Render free + Supabase free. Embeddings are precomputed on your MacBook (MPS), so the deployed backend stays tiny. Spotify is excluded: since February 2026, Development Mode requires Premium, allows 5 users and gives limited endpoints.\[3\] Music comes from Deezer/iTunes previews plus MusicBrainz/Last.fm metadata.
- **Handover:** Make AGENTS.md the single source of truth, since both Claude Code (via an @import in CLAUDE.md) and Antigravity read it. Push to GitHub by Day 8 so Jules (100 tasks/24h on AI Pro) can keep working. Don't renew Claude Pro (₹1,999–₹2,399/month in India; reports conflict) until you hit a milestone Gemini handles poorly.

---

## 1. One-page summary and scope decision

**Definition of "done by 9 Nov" (minimum shippable):**
1. **Deployed:** the public URL works on phone, laptop and TV (keyboard/D-pad) layouts.
2. **Five media, each with a thin real slice:**
   - catalog ingest (seed)
   - detail page
   - one recommendation rail
   - inclusion in unified search
   - a "Because you liked X" explanation
3. **Exclusion:** anything you've consumed (via import or a "seen it" tap) never appears in recommendations. A test enforces this.
4. **Attribution:** an About/Credits page plus inline credits:
   - TMDB logo and notice
   - "Availability data by JustWatch" next to providers
   - an active RAWG hyperlink on game pages
   - credits for IGDB, AniList, MusicBrainz, Deezer/Apple and Last.fm
5. **Repo hygiene:** local git history from Day 1; pushed to GitHub on Day 8 after a gitleaks scan.
6. **Handover:** HANDOVER, ROADMAP, DECISIONS, LEARNING and BACKLOG docs, plus AGENTS.md / CLAUDE.md / GEMINI.md.

**Feasible by 9 Nov vs. after 9 Nov**

| Feasible by 9 Nov | After 9 Nov |
|---|---|
| Seed catalogs (~1.5k movies, 1k TV, 1k anime, 2k music, 1k games) | Full-catalog refresh pipelines, incremental sync |
| Local sentence-transformer embeddings (MPS) on "vibe descriptions" | Fine-tuned / multimodal embeddings |
| Rule-based facets from tags + LLM facets on a few hundred seeds | LLM facets for the whole catalog |
| Cosine + facet overlap + popularity prior + MMR + hard exclusion | EASE^R CF baseline, hybrid blending, learned weights |
| Template explanations ("Shares *slow-burn* and *found family* with Arcane") | Grounded, spoiler-safe LLM explanations; LLM reranker |
| Local profiles (cookie UUID) + imports | Real auth (Supabase Auth), friends, group blend |
| Web TV mode (spatial navigation) | Native Android TV / tvOS app |
| NDCG@10 harness stub + temporal split code | Actual evaluation, user study, paper |

**Hours per day**

| Day | Standard (4–6 h) | Light (2–3 h) — cut to |
|---|---|---|
| 1 Sun | Setup, repo, tokens, shell (6 h) | Setup + repo + tokens only |
| 2 Mon | Schema, TMDB, India providers (5 h) | Movies only, no TV |
| 3 Tue | AniList + IGDB/RAWG (5 h) | AniList + RAWG only |
| 4 Wed | Music + search + **first preview deploy** (5 h) | Deezer/iTunes only; search = Postgres FTS |
| 5 Thu | Recommender v1 (6 h) | Embeddings + cosine + exclusion; templates |
| 6 Fri | UI screens + TV mode (6 h) | Home, detail, search only |
| 7 Sat | Imports + profiles (5 h) | Netflix CSV + Letterboxd only |
| 8 Sun | Deploy + GitHub (5 h) | Vercel snapshot mode only |
| 9 Mon | Polish + handover (4 h) | Handover docs only |

**Stop-anywhere ladder:** every day ends with something runnable.
- From Day 4, the web app also has a **snapshot mode**: it reads precomputed JSON from `apps/web/public/snapshots/`.
- You can deploy snapshot mode to Vercel from your laptop with the Vercel CLI, before GitHub exists.
- If the backend deploy fails on Day 8, you still have a working public demo.

**Slack for Sem VIII internship confirmation and end-sems:** Day 9 is deliberately light. Nothing after 9 Nov is scheduled until your exams end.

---

## 2. Verified facts snapshot (as of 1 Nov 2026)

| Item | What I found | Confidence |
|---|---|---|
| Claude Code on Pro | Usage is metered as a 5-hour session limit plus a weekly limit, shared across claude.ai, Desktop and Claude Code (Claude Help Center).\[4\]\[5\] Anthropic doubled Claude Code's 5-hour limits for Pro on 6 May 2026 and removed the peak-hours reduction.\[6\] The Pro "wrap-up" allowance applies once per weekly period. Usage credits at API rates are optional.\[4\] | High (official help page + multiple reports) |
| Prompts per window | Community estimates run from ~45 to ~90 prompts per 5-hour window; Anthropic publishes no count.\[5\]\[7\]\[8\] | Low; treat as anecdotal |
| Claude models on Pro | Secondary sources disagree on names (e.g., Sonnet 4.6/Sonnet 5, Opus 4.8/5.5, "Fable" models that need usage credits on Pro). Run `/model` to see what you actually have. | Unverified |
| Claude Pro in India | ₹1,999/month on the Apple App Store India; July 2026 press reports ₹2,000/month annual or ₹2,399/month monthly; Anthropic says "local currency where supported"; check claude.ai/upgrade.\[9\]\[10\]\[11\] | Conflicting |
| Google AI Pro | Google's India subscriptions page lists AI Pro at ₹1,950/month (US $19.99/month) with "4x higher usage access than Free-of-charge". Gemini app limits are compute-based and refresh every 5 h within a weekly cap. | Medium-high |
| Gemini CLI | Stopped serving Google AI Pro/Ultra/free individual accounts on **18 June 2026**; replaced by **Antigravity CLI (`agy`)**. Gemini Code Assist IDE extensions for individuals also stopped. Gemini CLI still works with paid API keys.\[2\]\[12\]\[13\] | High (Google Developers Blog, GitHub announcement) |
| Antigravity context files | Reads `AGENTS.md` and `GEMINI.md` in the workspace, `.agents/rules/*.md`, and the global `~/.gemini/GEMINI.md`.\[14\]\[15\] | Medium-high |
| Jules on AI Pro | 100 tasks per rolling 24 h, 15 concurrent; free tier 15/day; GitHub repos only.\[16\]\[17\] | High (multiple sources citing Google's limits page) |
| Next.js | 16.4 released 6 Oct 2026 (React 19.3, Cache Components on by default in create-next-app); latest patch 16.4.3 (23 Oct 2026).\[18\]\[19\] | High |
| Tailwind CSS | v4.3.3 (16 Jul 2026); CSS-first `@theme`.\[20\]\[21\] | High |
| Motion | v14.x (14.0.0 on 2 Oct 2026); import from `motion/react`.\[22\]\[23\] | Medium (exact patch varies) |
| Embla Carousel | Stable 8.6.0; v9 is in RC.\[24\] | High |
| Norigin Spatial Navigation | v3.x (3.4.0 on GitHub, Oct 2026), now split into core + React packages.\[25\]\[26\] | Medium |
| TMDB | Free for non-commercial use with attribution; commercial use needs a written agreement. Watch-provider data **requires JustWatch attribution** or access may be revoked. One summary of the terms says "no AI training on TMDB content".\[27\]\[28\]\[29\]\[30\] | High (TMDB terms + docs) |
| AniList | Documented 90 req/min, currently **degraded to 30 req/min**, plus a burst limiter; exceeding it triggers a 1-minute timeout.\[31\]\[32\] | High (AniList docs) |
| IGDB | 4 req/s, max 8 open requests; free under the Twitch Developer Service Agreement; commercial partnerships available.\[33\] | High (IGDB docs) |
| RAWG | Free: 20,000 requests/month. Attribution plus an **active hyperlink on every page** that uses RAWG data. Free commercial use only up to 100k MAU / 500k page views. No cloning RAWG.\[34\]\[35\] | High (RAWG ToS) |
| Spotify | From 11 Feb 2026 (existing apps from 9 Mar): Development Mode requires the owner to have Premium, allows 1 client ID and 5 users, and narrows endpoints.\[36\]\[37\] | High (Spotify migration guide, TechCrunch) |
| Deezer | Public API, no key; 30-second preview MP3s; preview URLs are signed and expire. Commercial-use terms are unclear (a community moderator says non-commercial use is fine with attribution).\[38\]\[39\]\[40\] | Medium |
| iTunes Search | No key. Apple's Search API page says it is "limited to approximately 20 calls per minute (subject to change)". | Medium-high (Apple) |
| MusicBrainz | 1 req/s; requires an identifying User-Agent.\[40\] | High |
| Supabase Free | 500 MB DB per project, 2 active projects, 5 GB egress; **pauses after 1 week of low activity**; fixed 2 GB disk, read-only at 95%.\[41\]\[42\] | High (Supabase pricing) |
| Neon Free | 1 GB storage per project, 100 CU-hours/project/month, scale-to-zero after 5 min (cannot be disabled).\[43\] | High (Neon FAQ, 1 Oct 2026) |
| Render Free | 750 instance hours per workspace per month, 512 MB RAM / 0.1 CPU, spins down after 15 min idle, about 1 min to spin up; free Postgres expires after 30 days.\[44\]\[45\] | High |
| Vercel Hobby | Non-commercial only; 1M function invocations; 300 s max duration; cron once per day; 1,000 image-optimization source images.\[46\]\[47\]\[48\] | High (Vercel docs) |
| Gemini API free tier | Embedding limits were once quoted as 100 RPM / 30k TPM / 1k RPD; Google now shows per-project limits only in AI Studio. Free-tier prompts may be used to improve Google products.\[49\]\[50\]\[51\] | Medium |
| Last.fm API terms/limits | API Evangelist's third-party summary of the Last.fm ToS: free for non-commercial use only (commercial use needs an agreement via partners@last.fm), about 5 req/s per originating IP, a 100 MB "Reasonable Usage Cap" on stored data, and "powered by AudioScrobbler" attribution. Check against Last.fm's own terms. | Low-medium (third-party summary) |

---

## 3. Claude Pro usage strategy (1–9 Nov)

**How the meter works:**
- Each 5-hour window starts with your first prompt.\[6\]
- A weekly cap sits on top.\[52\]
- Chat on claude.ai, Desktop and Claude Code all drain **the same pool**.\[5\]
- So: **don't use claude.ai chat for this project this week.** Use Claude Code only.
- Check Settings → Usage on claude.ai each morning, and note when your weekly limit resets.\[52\]

**Daily rhythm (IST):**
- **Window A, about 08:30–13:30:** the heavy build session. Plan mode, then implementation.
- **Gap, 13:30–15:00:** manual work with no AI:
  - API keys
  - Figma moodboard
  - reading diffs
  - LEARNING.md
- **Window B, starting 15:00 or later:** the second build session, then the "defend your code" prompt and a handover commit.
- **Window C (optional, after 20:30):** only on Days 1, 5 and 6, and only if the weekly bar is under about 60%.

**Weekly budget:** your weekly cap must cover 9 days. Treat Days 1, 5 and 6 as heavy and the others as medium. If Settings → Usage shows more than 70% weekly use by the end of Day 5, switch Days 6–7 to the "light" variants. Hand imports to Antigravity on 7 Nov while you still have Claude for review.

**Token discipline (highest leverage first):**
1. **Plan mode first** (Shift+Tab to cycle into plan mode). Approve a numbered plan before any edits. Bad plans are cheap; bad implementations are expensive.
2. **One task per session, with acceptance criteria.** Use the prompt templates below; every prompt ends in a "Done when" list.
3. **`/clear` between tasks.** Use `/compact` only when you must keep context mid-task. Long conversations re-send context on every turn.
4. **Keep CLAUDE.md lean.** Under ~80 lines, pointing to docs rather than inlining them. Every line is re-read every turn.
5. **Point to files, don't paste.** "Read `services/api/src/canopy/ingest/tmdb.py`" costs less than pasting it.
6. **Make Claude run tests itself** (`make test`), so you don't spend turns reporting failures back.
7. **Custom slash commands** in `.claude/commands/` (`/plan-task`, `/review-diff`, `/defend`, `/handover`) remove repeated prompt text.
8. **Pick models deliberately.** Use the default Sonnet-class model for implementation. Use the strongest model `/model` offers only for the master plan (Day 1) and the recommender plan (Day 5).
9. **Never let it browse docs blindly.** Give it the exact endpoint shapes from Section 9.
10. **If you hit the limit mid-task,** commit what exists (`git add -A && git commit -m "wip: <task>"`), write `docs/NEXT.md`, and wait. Don't re-explain later; `claude --continue` resumes.

**Spend Claude on:**
- the architecture and repo scaffold
- the design-token system and core components (Rail, Tile, Hero, focus system)
- the DB schema and migrations
- the ingestion framework (rate limiter, cache, retry)
- the recommender core and exclusion test
- deployment config

**Leave for Antigravity/Jules after 9 Nov:**
- additional screens
- copy edits
- more ingesters
- test backfill
- refactors
- EASE^R
- evaluation

**8–9 Nov:** Claude writes `docs/HANDOVER.md` from the actual code state, including file maps, commands, known bugs and the next 15 tasks as self-contained prompts. It then verifies that AGENTS.md is accurate by running every command it lists.

---

## 4. Handover to Google AI Pro after 9 Nov

**What AI Pro gives you for coding (Nov 2026):**
- **Antigravity CLI (`agy`)** replaces Gemini CLI for AI Pro.\[1\]
  - Install: `curl -fsSL https://antigravity.google/cli/install.sh | bash` (installs to `~/.local/bin/agy`).\[53\]
  - Keeps Agent Skills, Hooks, Subagents and plugins.\[2\]
  - Closed-source; no 1:1 feature parity at launch.\[2\]\[54\]
  - Quotas are compute-based with weekly caps.\[55\]
- **Antigravity IDE / desktop app:** an agent-first IDE with higher limits for paid plans.\[56\]
- **Jules:** an async cloud agent that clones a **GitHub** repo into a VM, runs tests and opens PRs. AI Pro gets 100 tasks per rolling 24 h with 15 concurrent.\[57\]\[58\] This is the main reason to push to GitHub by Day 8.
- **Gemini app / AI Studio:** useful for design critique of screenshots and for getting a free-tier Gemini API key for facet extraction.
- **Firebase Studio:** not verified this session; don't plan around it.
- **Student note:** Google has offered eligible college students a free year of AI Pro.\[59\] Check whether that applies before paying.

**Make the repo tool-agnostic:**
- `AGENTS.md` is the canonical rules file, read by Antigravity, Jules and Codex-style agents.
- `CLAUDE.md` contains `@AGENTS.md` plus Claude-only notes. Claude Code supports `@path` imports.
- `GEMINI.md` is a 5-line pointer to AGENTS.md. Antigravity reads both; if a `.antigravity.md` exists, it takes precedence, so don't create one.
- Docs:
  - `docs/HANDOVER.md` (state of the world)
  - `docs/ROADMAP.md` (milestones)
  - `docs/DECISIONS.md` (ADRs)
  - `docs/BACKLOG.md` (ready-to-paste task prompts)
  - `docs/LEARNING.md` (your interview notes)

**Continuation prompts for Antigravity CLI / Jules:**

```text
[agy — session start]
Read AGENTS.md, docs/HANDOVER.md and docs/BACKLOG.md. Summarise in 10 bullets: architecture, how to run locally, how to run tests, and the top 3 open tasks. Do not edit anything yet. Then propose a plan for BACKLOG task #1 with files to touch and acceptance criteria, and wait for my approval.
```

```text
[agy — implement one backlog task]
Implement BACKLOG task #<n> exactly as specified. Constraints: follow AGENTS.md rules (tests first for logic, no new dependencies without asking, design tokens only — no raw hex or Tailwind default colours). Run `make test` and `pnpm -C apps/web lint` and fix failures. Finish by appending a dated entry to docs/HANDOVER.md "Changelog" and ticking the task in docs/BACKLOG.md. Show me the diff summary.
```

```text
[Jules task — small, async, PR-sized]
Repository: <you>/canopy. Task: <one backlog item, e.g. "Add Last.fm artist.getsimilar enrichment to services/api/src/canopy/ingest/lastfm.py with a 4 req/s limiter and a cached JSON fixture test">. Follow AGENTS.md. Acceptance: `make test` passes; new test file tests/ingest/test_lastfm_similar.py; no secrets committed; docs/BACKLOG.md item ticked. Keep the PR under 300 changed lines.
```

**Gemini vs. renewing Claude Pro (for this project):**

| Factor | Continue on AI Pro (Antigravity + Jules) | Renew Claude Pro |
|---|---|---|
| Marginal cost | ₹0 (already paid) | ≈₹1,999–₹2,399/month in India |
| Interactive multi-file work | Workable; secondary reviews say Gemini needs more iterations and drifts on long sessions\[55\] | Stronger instruction-following in my experience; that's my judgement, not a benchmark |
| Async background work | Jules: 100 tasks/day, a strong fit for test backfill and ingesters | No equivalent async quota on Pro |
| Design fidelity | Needs stricter rules; give it AGENTS.md design rules + screenshots | Better at holding a design system, in my experience (subjective) |

**Recommendation:** don't renew on 9 Nov. Run on AI Pro through end-sems (small Jules tasks, Antigravity for features). Re-subscribe to Claude Pro for **one month** only when you start a hard milestone: the agentic tool-calling layer or the EASE^R + evaluation sprint, ideally timed to a resume push.

---

## 5. MacBook local-first setup (Apple Silicon)

**Postgres choice:** use **OrbStack + the `pgvector/pgvector` Docker image**.
- It's one command, reproducible, and easy to wipe.
- You can match the Postgres major version to your Supabase project (check Supabase → Settings → Infrastructure).
- It keeps your Mac clean.
- Postgres.app is a good second choice (GUI, and it bundles pgvector). Homebrew Postgres + pgvector risks version-mismatch friction.

```bash
# 0) Xcode CLT + Homebrew
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile && eval "$(/opt/homebrew/bin/brew shellenv)"

# 1) Core tools
brew install git gh gitleaks jq just uv fnm
brew install --cask orbstack visual-studio-code

# 2) Python 3.12 via uv
uv python install 3.12

# 3) Node LTS + pnpm (via corepack)
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc && source ~/.zshrc
fnm install --lts && fnm default lts-latest
corepack enable && corepack prepare pnpm@latest --activate

# 4) Claude Code (native installer is the recommended method)
curl -fsSL https://claude.ai/install.sh | bash
claude --version && claude   # log in with your Pro account when prompted
# Alternative: brew install --cask claude-code

# 5) Vercel CLI (for snapshot deploys before GitHub exists)
pnpm add -g vercel

# 6) Project directory + local git (NO remote yet)
mkdir -p ~/dev/canopy && cd ~/dev/canopy
git init -b main
git config user.name "Rhian <surname>" && git config user.email "<you>@example.com"

# 7) Local Postgres + pgvector (start OrbStack app once first)
docker run -d --name canopy-pg -e POSTGRES_PASSWORD=canopy -e POSTGRES_DB=canopy \
  -p 5432:5432 -v canopy-pgdata:/var/lib/postgresql/data pgvector/pgvector:pg17
docker exec -it canopy-pg psql -U postgres -d canopy -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

Redis is optional; skip it. Use Postgres tables plus an on-disk HTTP cache (`data/cache/`) instead.

**VS Code extensions:**
- Python, Pylance, Ruff
- ESLint
- Tailwind CSS IntelliSense
- Prettier
- Even Better TOML
- SQLTools + PostgreSQL driver
- GitLens
- Playwright Test

**API keys you must get yourself** (put them in `.env`, never in chat):

| Key | Where | Notes |
|---|---|---|
| `TMDB_READ_TOKEN` | themoviedb.org → Settings → API (choose "Developer", non-commercial) | Use the v4 Read Access Token as Bearer |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` (IGDB) | dev.twitch.tv/console → Register app (Confidential) | Enable 2FA on Twitch first |
| `RAWG_API_KEY` | rawg.io/apidocs | 20k req/month |
| `LASTFM_API_KEY` | last.fm/api/account/create | Non-commercial only, about 5 req/s per IP (per a third-party summary of Last.fm's ToS) |
| `STEAM_WEB_API_KEY` | steamcommunity.com/dev/apikey | Only for Steam import; the profile must be public |
| `GEMINI_API_KEY` (optional) | aistudio.google.com | Free tier: data may be used for product improvement |
| None needed | AniList, MusicBrainz, iTunes Search, Deezer public API | Set a descriptive User-Agent with your email for MusicBrainz |

**Day 8 GitHub push** (exact steps in Day 8 below): run `gitleaks git -v`, check `.gitignore`, then `gh auth login` and `gh repo create canopy --private --source=. --remote=origin --push`. Flip to public after the README and license are in place.

---

## 6. Architecture decision, master repo prompt, repo tree, context files

**Decision: Next.js + FastAPI (with offline Python jobs), not Next.js-only.**

Why:
- **Resume value:** your target roles (AI/ML/GenAI) expect a Python ML service. FastAPI + pgvector + an evaluation harness is the story interviewers want.
- **Speed:** ingestion and embeddings run **locally on the Mac**, not in the cloud. The deployed API only does SQL, vector search and light math, so it fits Render's 512 MB / 0.1 CPU free instance without loading any ML model.
- **Free deploy:** Vercel (web) + Render (API) + Supabase (DB) are all free.
- **Resilience:** snapshot mode means the frontend survives a sleeping or failed backend.

The trade-off is two deploys instead of one, plus cold starts of about 1 minute on Render. To mitigate:
- server-side caching in Next.js
- skeletons
- a "warming up" state

**Styling decision: Tailwind v4 with a reset theme.**
- Tailwind is the fastest for AI agents and keeps tokens in one CSS `@theme` block.
- Its *defaults* are what make AI UIs look alike (indigo-500 buttons, the gray scale). So we delete them: `--color-*: initial; --font-*: initial;`. Only Canopy tokens exist, so neither Claude nor Gemini can reach for `bg-indigo-500`.
- CSS Modules are more "hand-made" but slower to generate consistently.
- vanilla-extract adds build complexity without benefit here.

**Name:** I suggest **Canopy**: one canopy over all your media, and green by default. The design language is **Understory**. Alternatives: *Verdance*, *Mossline*, *Fernlight*. Do a quick trademark/domain search before going public.

### 6.1 Repo tree (every file and folder, one-line purpose)

```text
canopy/
├── AGENTS.md                         # Canonical agent rules (all tools read this)
├── CLAUDE.md                         # @AGENTS.md + Claude-only workflow notes
├── GEMINI.md                         # Pointer to AGENTS.md for Antigravity
├── README.md                         # Pitch, screenshots, architecture, run steps, credits
├── LICENSE                           # MIT for code (data not included)
├── .gitignore                        # node_modules, .venv, .env*, data/, .next, caches
├── .env.example                      # Every env var with comments, no values
├── .editorconfig                     # Consistent whitespace
├── .nvmrc                            # Node LTS version pin
├── .python-version                   # 3.12
├── justfile                          # One-word commands: setup, dev, test, ingest, embed, snapshot
├── package.json                      # Workspace root scripts
├── pnpm-workspace.yaml               # apps/*, packages/*
├── docker-compose.yml                # Local Postgres+pgvector (mirror of the docker run)
├── .gitleaks.toml                    # Secret-scan config/allowlist
├── .claude/
│   ├── settings.json                 # Permissions: allow tests/lint, deny reading .env
│   └── commands/
│       ├── plan-task.md              # /plan-task — plan-mode template with acceptance criteria
│       ├── review-diff.md            # /review-diff — self-review checklist
│       ├── defend.md                 # /defend — interview-style explanation of today's code
│       └── handover.md               # /handover — update HANDOVER.md + NEXT.md
├── .agents/
│   └── rules/design.md               # Design rules for Antigravity (mirrors docs/DESIGN.md core rules)
├── apps/
│   └── web/                          # Next.js 16 App Router (TypeScript)
│       ├── package.json              # next, react, motion, embla, radix/react-aria, norigin
│       ├── next.config.ts            # Image remotePatterns, custom loader, env
│       ├── tsconfig.json             # Strict TS
│       ├── eslint.config.mjs         # Lint rules incl. no raw hex in className
│       ├── postcss.config.mjs        # Tailwind v4 plugin
│       ├── playwright.config.ts      # E2E config
│       ├── public/
│       │   ├── brand/                # Canopy wordmark/logo SVG (yours, original)
│       │   ├── attribution/          # TMDB, JustWatch, RAWG, IGDB logos per their rules
│       │   └── snapshots/            # Precomputed JSON for snapshot mode
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx        # Fonts, theme, TopNav, MiniPlayer, FocusRoot
│       │   │   ├── globals.css       # @import tailwind + @theme tokens (generated)
│       │   │   ├── page.tsx          # Home: hero + rails
│       │   │   ├── (media)/movies/page.tsx   # Movies tab
│       │   │   ├── (media)/shows/page.tsx    # TV tab
│       │   │   ├── (media)/anime/page.tsx    # Anime tab
│       │   │   ├── (media)/music/page.tsx    # Music tab
│       │   │   ├── (media)/games/page.tsx    # Games tab
│       │   │   ├── title/[id]/page.tsx       # Movie/TV/anime detail
│       │   │   ├── artist/[id]/page.tsx      # Artist page
│       │   │   ├── album/[id]/page.tsx       # Album page
│       │   │   ├── game/[id]/page.tsx        # Game page
│       │   │   ├── search/page.tsx           # Search with chip filters
│       │   │   ├── profile/page.tsx          # Taste profile
│       │   │   ├── import/page.tsx           # Import flow
│       │   │   ├── about/page.tsx            # Credits & attributions
│       │   │   ├── not-found.tsx             # 404 in brand voice
│       │   │   └── api/health/route.ts       # Web health check
│       │   ├── components/
│       │   │   ├── shell/TopNav.tsx          # Pill tabs, search, profile
│       │   │   ├── shell/FocusRoot.tsx       # Spatial-nav init for TV mode
│       │   │   ├── hero/Hero.tsx             # Featured rotator
│       │   │   ├── rail/Rail.tsx             # Horizontal rail (scroll-snap + roving focus)
│       │   │   ├── rail/Tile.tsx             # Poster/landscape/square/capsule tile variants
│       │   │   ├── rail/Top10Tile.tsx        # Ranked tile with numeral
│       │   │   ├── chips/ChipBar.tsx         # Filter chips
│       │   │   ├── detail/DetailHeader.tsx   # Backdrop, title, meta chips, actions
│       │   │   ├── detail/Availability.tsx   # India providers + JustWatch credit
│       │   │   ├── detail/TagCloud.tsx       # Facets/tags chips
│       │   │   ├── detail/BecauseYouLiked.tsx# Explanation block
│       │   │   ├── music/MiniPlayer.tsx      # Persistent 30-s preview player
│       │   │   ├── music/TrackRow.tsx        # Track list row
│       │   │   ├── game/Capsule.tsx          # Game capsule header
│       │   │   ├── import/ImportCard.tsx     # Per-source import UI
│       │   │   ├── feedback/Skeleton.tsx     # Skeleton loaders
│       │   │   └── attribution/Credit.tsx    # Inline credit component
│       │   ├── lib/
│       │   │   ├── api.ts                    # Typed client; live vs snapshot mode
│       │   │   ├── types.ts                  # Shared types mirroring API schemas
│       │   │   ├── image-loader.ts           # Maps widths → TMDB/IGDB size variants
│       │   │   ├── profile.ts                # Local profile UUID cookie
│       │   │   └── tv.ts                     # TV-mode detection
│       │   └── styles/fonts.ts               # next/font setup
│       └── tests/e2e/                        # Playwright: home, search, detail, keyboard nav
├── packages/
│   └── tokens/
│       ├── tokens.json               # Source of truth: colour, type, space, radius, motion
│       ├── build.mjs                 # Generates CSS @theme block + TS constants
│       └── README.md                 # How to change tokens
├── services/
│   └── api/                          # FastAPI (uv)
│       ├── pyproject.toml            # fastapi, uvicorn, psycopg[binary,pool], httpx, pydantic-settings, numpy
│       ├── uv.lock                   # Locked deps
│       ├── Dockerfile                # Slim runtime image for Render
│       ├── src/canopy/
│       │   ├── main.py               # App factory, CORS, routers
│       │   ├── config.py             # Settings from env
│       │   ├── db.py                 # Connection pool + helpers
│       │   ├── schemas.py            # Pydantic response models
│       │   ├── api/works.py          # GET /works/{id}, /works?media=
│       │   ├── api/search.py         # GET /search?q=&media=
│       │   ├── api/recs.py           # GET /recs/home, /recs/because/{id}
│       │   ├── api/profile.py        # POST /events, GET /profile
│       │   ├── api/imports.py        # POST /imports/{source}
│       │   ├── ingest/http.py        # Rate limiter, retry/backoff, disk cache, User-Agent
│       │   ├── ingest/tmdb.py        # Movies/TV + IN watch providers
│       │   ├── ingest/anilist.py     # Anime via GraphQL
│       │   ├── ingest/igdb.py        # Games via Apicalypse
│       │   ├── ingest/rawg.py        # Games fallback/enrichment
│       │   ├── ingest/deezer.py      # Charts, artists, tracks, previews
│       │   ├── ingest/itunes.py      # India-catalog search + previews
│       │   ├── ingest/musicbrainz.py # MBIDs, ISRC links (1 req/s)
│       │   ├── ingest/lastfm.py      # Tags, similar artists
│       │   ├── ingest/normalize.py   # Source → unified `works` rows + vibe text
│       │   ├── rec/embed.py          # Local sentence-transformers (MPS) → pgvector
│       │   ├── rec/facets.py         # Tag→facet rules + optional LLM extraction
│       │   ├── rec/profile.py        # User taste vector from events
│       │   ├── rec/rank.py           # Scoring formula
│       │   ├── rec/mmr.py            # Diversity re-ranking
│       │   ├── rec/exclude.py        # Hard exclusion of consumed items
│       │   ├── rec/explain.py        # Template explanations
│       │   ├── imports/netflix.py    # ViewingActivity CSV parser + matcher
│       │   ├── imports/letterboxd.py # watched.csv/ratings.csv
│       │   ├── imports/anilist_user.py # MediaListCollection by username
│       │   ├── imports/steam.py      # GetOwnedGames
│       │   ├── imports/match.py      # Fuzzy title+year matching
│       │   └── eval/                 # split.py, metrics.py (NDCG@10) — stubs for later
│       └── tests/                    # pytest: ingest fixtures, rank, mmr, exclusion, imports
├── db/
│   ├── migrations/0001_init.sql      # Extensions + core tables
│   ├── migrations/0002_indexes.sql   # HNSW, GIN, trigram indexes
│   ├── migrations/0003_events.sql    # Profiles, events, imports
│   └── migrate.sh                    # Applies migrations in order (psql)
├── scripts/
│   ├── seed_all.sh                   # Runs all ingesters with caps
│   ├── embed_all.sh                  # Computes embeddings locally
│   ├── export_snapshot.py            # Writes apps/web/public/snapshots/*.json
│   └── push_to_supabase.sh           # pg_dump local → restore to Supabase
├── data/                             # (gitignored) raw cache, exports, imports
├── docs/
│   ├── HANDOVER.md                   # Current state, how to run, known issues, changelog
│   ├── ROADMAP.md                    # Milestones to Dec 2026+
│   ├── DECISIONS.md                  # ADRs
│   ├── LEARNING.md                   # Daily notes in your own words
│   ├── BACKLOG.md                    # Ready-to-run task prompts
│   ├── ARCHITECTURE.md               # Diagram + data flow
│   ├── DESIGN.md                     # Understory design system
│   ├── DATA_SOURCES.md               # Endpoints, limits, terms, attribution per source
│   └── moodboard/                    # Your references/screens (not copied assets)
└── .github/workflows/                # Added Day 8
    ├── ci.yml                        # Lint + tests on push
    ├── keepalive.yml                 # Daily DB ping (prevents Supabase pause)
    └── refresh.yml                   # Weekly trending refresh (later)
```

### 6.2 Master "generate the whole repo" prompt (Day 1, plan mode first)

```text
You are scaffolding a new monorepo called "canopy" in the current empty directory (git already initialised, no remote — never add one, never push).

GOAL: a cross-media recommender web app (movies, TV, anime, music, games). Today = skeleton only: every folder/file below exists with minimal working content, all commands run, tests pass.

STACK (do not substitute):
- apps/web: Next.js 16.4 App Router, TypeScript strict, pnpm, Tailwind CSS v4 (CSS-first @theme), motion (import from "motion/react"), embla-carousel-react v8 (stable, not v9 RC), @noriginmedia/norigin-spatial-navigation (latest 3.x; check its README for the React package split), Radix primitives or react-aria-components for dialogs/tabs/tooltips. No shadcn/ui. No lucide-react (use @phosphor-icons/react, one weight).
- services/api: Python 3.12, uv, FastAPI, uvicorn, psycopg 3 with pool, httpx, pydantic-settings, numpy, pytest. NO torch/sentence-transformers in the runtime dependency group — put them in an optional "ml" group used only locally.
- db: Postgres + pgvector + pg_trgm, plain SQL migrations applied by db/migrate.sh.
- packages/tokens: tokens.json → build.mjs generates the @theme block in apps/web/src/app/globals.css.

CREATE exactly this tree: <paste the tree from section 6.1>.

RULES:
1. Read AGENTS.md (create it first from my text below) and follow it.
2. globals.css must start with `@import "tailwindcss";` and an @theme block that begins with `--color-*: initial; --font-*: initial;` then only Canopy tokens.
3. lib/api.ts supports API_MODE=live|snapshot (snapshot reads /snapshots/*.json).
4. .env.example lists: DATABASE_URL, TMDB_READ_TOKEN, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, RAWG_API_KEY, LASTFM_API_KEY, STEAM_WEB_API_KEY, GEMINI_API_KEY, MUSICBRAINZ_USER_AGENT, NEXT_PUBLIC_API_BASE, API_MODE, CORS_ORIGINS.
5. .claude/settings.json denies Read on .env* and data/**.
6. justfile recipes: setup, dev (web+api concurrently), test, lint, migrate, ingest <source>, embed, snapshot.
7. Add one smoke test per side: pytest hits /health; Playwright loads "/" and sees the TopNav.
8. Commit in logical steps with conventional commit messages.

PROCESS: Enter plan mode. Output a numbered plan grouped by (a) root config, (b) web, (c) api, (d) db, (e) docs. Wait for my "go". Then implement group by group, running `just test` after (b) and (c).

DONE WHEN:
- `just setup && just migrate && just test && just lint` all succeed.
- `just dev` serves web on :3000 and api on :8000/health.
- `git log --oneline` shows ≥5 commits; `git remote -v` is empty.
- No file contains a Tailwind default colour class (grep for "indigo|violet|purple|slate-|gray-" returns nothing in apps/web/src).
```

### 6.3 Initial AGENTS.md (canonical, about 70 lines)

```markdown
# AGENTS.md — Canopy

## What this is
Cross-media recommender (movies, TV, anime, music, games). Web: apps/web (Next.js 16, Tailwind v4). API: services/api (FastAPI, uv). DB: Postgres+pgvector (db/migrations). Docs: docs/.

## Commands
- just setup | just dev | just test | just lint | just migrate
- just ingest <tmdb|anilist|igdb|rawg|deezer|itunes|musicbrainz|lastfm> | just embed | just snapshot

## Workflow rules
1. Plan before editing: list files to touch + acceptance criteria; wait for approval on anything >3 files.
2. Small diffs. One task per session. Run `just test` and `just lint` before declaring done.
3. Logic changes need tests (pytest for api, Playwright for critical UI flows).
4. Never read, print, or commit .env* or data/**. Never add a git remote or push unless explicitly told.
5. No new dependency without stating why and asking.
6. Update docs/HANDOVER.md changelog at the end of each task.

## Hard invariants (tests enforce these)
- Exclusion: items in a profile's consumed set never appear in any /recs response (tests/test_exclusion.py).
- Attribution: pages showing watch providers render <Credit source="justwatch">; pages with RAWG data link to rawg.io; About page lists all sources.
- Rate limits: every external call goes through ingest/http.py limiter (AniList ≤25/min, IGDB ≤4/s, MusicBrainz ≤1/s).

## Design rules (see docs/DESIGN.md — Understory)
- Use only design tokens (bg-surface-1, text-ink-2, etc.). No raw hex, no Tailwind default palette, no arbitrary colours.
- Fonts: Bricolage Grotesque (display), Instrument Sans (UI/body), IBM Plex Mono (meta). Never Inter/Geist/Roboto.
- Radii: tile 6px, card 10px, sheet 16px, pill 999px. Never apply the largest radius to everything.
- No gradients except: hero scrim (bg→transparent) and the single brand "canopy glow" token.
- No emoji in UI, no sparkle icons, no glassmorphism except the TopNav on scroll (one blur value).
- Copy is specific and plain ("Because you rewatched Arcane"), never marketing filler.
- Every interactive element has a visible focus state (focus token), reachable by keyboard/arrow keys.

## Data-source etiquette
TMDB non-commercial + attribution; JustWatch credit for providers; RAWG backlink on every page using it; IGDB via Twitch creds; AniList public GraphQL; MusicBrainz User-Agent with contact email; Deezer/iTunes 30-s previews only, linking back to source. Details: docs/DATA_SOURCES.md.
```

**CLAUDE.md:**
```markdown
@AGENTS.md

## Claude Code specifics
- Start non-trivial tasks in plan mode. Use /clear between tasks.
- Custom commands: /plan-task, /review-diff, /defend, /handover.
- If usage is near the limit: commit WIP, write docs/NEXT.md with exact next steps, stop.
```

**GEMINI.md:**
```markdown
# GEMINI.md
All project rules live in AGENTS.md — read it first and follow it exactly.
Then read docs/HANDOVER.md and docs/BACKLOG.md before proposing work.
Design rules: docs/DESIGN.md and .agents/rules/design.md. Never use default Tailwind colours.
```

---

## 7. UI/UX design system — "Understory"

### 7.1 What to borrow (patterns, not brands)

| Source | Pattern worth adapting | How Understory adapts it |
|---|---|---|
| Google TV / Android TV | Hero carousel up top; horizontal rows below; every item has a focused state; row-and-grid layout navigable on X/Y. The 2025 redesign replaced the "For you" tab with "Home" in a pill-shaped bar alongside Live and Apps.\[60\]\[61\]\[62\] | Pill tab bar (Home · Movies · Shows · Anime · Music · Games); D-pad focus scale; "Continue" rail first |
| Netflix | Top 10 rails with large numerals; hover/focus preview expansion; maturity/metadata chips | Ranked rail with outlined numerals in our display font; focus expands the tile to a landscape card with 2 lines of metadata |
| Prime Video (July 2024 redesign) | Content-forward nav bar; hero rotator that plays video on living-room devices; entitlement logos on hero and title cards; "animations, smooth page transitions and zoom effects"\[63\]\[64\] | Hero with a muted motion backdrop (no autoplay audio); "Available on" logos only on detail pages; zoom-on-focus |
| JioHotstar | Dense India-first rails, language and regional filters | Language chips (Hindi, Tamil, Telugu, Japanese, Korean…) on the Movies/Shows tabs |
| Apple.com | Big type, generous whitespace, one idea per viewport, scroll-linked reveals, restraint | Detail pages: editorial header, a single scroll-driven reveal per section, max 2 type sizes per block |
| Spotify | Persistent now-playing bar; library sidebar; "mixes" | MiniPlayer docked at the bottom on all pages; "Mixes" = cross-media bundles ("Rainy neo-noir: 3 films, 1 anime, 1 album, 1 game") |
| Steam | Capsule art, user tags, review summary, platforms | Game page capsule header, tag chips with weight, "Players say: Very positive (RAWG/IGDB ratings)" |
| YouTube | Chips filter bar; watch-next column | Search chips: All · Movies · Shows · Anime · Music · Games · In India · Free · <2h; "Up next" column on detail |

**Legal/IP note:**
- Don't copy logos, names, trademarked UI or pixel layouts.
- Don't use red-on-black Netflix styling, Prime blue or the Spotify green #1DB954. Our greens are deliberately bluer and deeper.
- Use streaming-provider logos **only as data** from TMDB/JustWatch, with attribution.
- Don't make any claim of affiliation.

### 7.2 Principles
1. **Content is the colour.** Chrome is near-black green; posters bring the colour; green appears as signal (focus, selection, primary action).
2. **One focus, always visible.** Every screen has exactly one obviously focused or selected thing, whether you use a mouse, keyboard or remote.
3. **Editorial restraint.** Apple-style whitespace on detail pages; Google-TV density on browse pages. Never both at once.
4. **Specific words.** Every label says something true about this title or this user.
5. **Motion explains, never decorates.** Movement shows where focus went or what expanded.

### 7.3 Tokens

**Colour (dark-first).** Contrast ratios are computed against `ink-950` (#0B110E) unless noted.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `bg` / ink-950 | #0B110E | App background | — |
| `surface-1` | #111A15 | Rails background, cards | — |
| `surface-2` | #17231C | Raised panels, menus | — |
| `surface-3` | #1E2D24 | Hover/selected rows | — |
| `line` | #2A3B31 | Hairlines, dividers | decorative |
| `text-1` | #ECF3EE | Primary text | 17.0:1 ✅ AAA |
| `text-2` | #A9B8AE | Secondary text | 9.3:1 ✅ AAA |
| `text-3` | #7E8F84 | Meta, captions | 5.6:1 ✅ AA |
| `forest-900` | #0F2A1D | Brand panels, selected chip bg (dark) | — |
| `forest-700` | #1B4D33 | Selected chip / active tab bg | white text 9.7:1 ✅ |
| `emerald-500` | #1FAE6E | Primary button bg, progress | 6.7:1 vs bg ✅; **use dark ink text (#06110B), never white** (white = 2.9:1 ❌) |
| `mint-300` | #7BE0B0 | Links, active icons, ratings | 12.0:1 ✅ |
| `signal-400` (neon) | #3DFF9A | Focus ring, live dot only | 14.6:1 ✅ |
| `amber-400` | #E8B04B | "New", rank numerals (sparingly) | high |
| `danger-400` | #F0716A | Errors | high |

**Light mode:** bg #F6F8F5, `text-1` #0E1A13 (16.7:1), and links/accents in `emerald-700` #146C45 (6.0:1 on bg). Use the same tokens with swapped values under `[data-theme="light"]`.

**Typography.** All are free under the SIL Open Font License on Google Fonts; confirm each license file when you download.
- **Display:** Bricolage Grotesque, 600–800, optical sizing. Characterful, not Inter.
- **UI/Body:** Instrument Sans, 400–600.
- **Meta/numerals:** IBM Plex Mono, 400–500, for runtime, year, BPM, ranks.
- **Alternative pairing:** Familjen Grotesk + Hanken Grotesk. Optionally use Fraunces italic for pull-quotes only on detail pages.

| Role | Size (clamp) | Line-height | Weight |
|---|---|---|---|
| display-xl (hero title) | clamp(2.5rem, 1.6rem + 3.2vw, 4.5rem) | 1.02 | 750 |
| display-l (detail title) | clamp(2rem, 1.4rem + 2.2vw, 3.5rem) | 1.05 | 700 |
| title (rail heading) | 1.25rem / TV 1.75rem | 1.2 | 600 |
| body | 1rem / TV 1.375rem | 1.55 | 400 |
| meta | 0.8125rem mono / TV 1.125rem | 1.4 | 450 |

**Other scales:**
- **Spacing (4-pt):** 0, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Rail gutter is 16 px on phone, 24 px on laptop, 48 px on TV. TV safe area: 5% inset on all sides.
- **Radii:** tile 6, card 10, sheet 16, pill 999. No large radius on tiles.
- **Elevation:** in dark mode, elevation is **surface steps**, not shadows. The only shadow is the focused tile's `0 16px 40px rgb(0 0 0 / .55)`.
- **Motion:**
  - durations: `instant 90ms`, `quick 160ms`, `base 240ms`, `slow 420ms`, `cinematic 640ms` (hero crossfade only)
  - easings: `standard cubic-bezier(.2,0,0,1)`, `enter cubic-bezier(.16,1,.3,1)`, `exit cubic-bezier(.4,0,1,1)`
  - all motion collapses to opacity-only under `prefers-reduced-motion`

**Focus spec (TV-style):**
- The focused tile scales 1.06 (TV mode 1.10) over 160 ms with the `enter` easing.
- It gets a 2 px `signal-400` ring at 3 px offset and the focus shadow.
- Neighbours dim to 85% opacity.
- The rail auto-scrolls so the focused tile sits at the 2nd slot from the left, like Google TV and Netflix TV.
- The ring is never removed. Use `:focus-visible`, and in TV mode force-show it.

**Spatial navigation (options):**
1. **Norigin Spatial Navigation** (v3.x, React package): purpose-built for TV web apps and tested on Tizen, webOS and Vidaa. **Recommended for TV mode.**
2. Roving tabindex + arrow keys per rail, with React Aria's `FocusScope` for overlays. **Recommended for desktop**, since it's simpler.
3. A W3C-style CSS spatial-navigation polyfill. Dated; avoid.

### 7.4 Layout specs per screen

- **Home:**
  - TopNav: wordmark left, pill tabs centre, search and profile right. It turns translucent-blur only after 24 px of scroll.
  - Hero: 70vh on laptop, 56vh on phone, 80vh on TV. A backdrop with a bottom scrim (`bg`→transparent); title in display-xl; one-line "why" ("Because you liked *Dark*"); meta chips (year · runtime · UA 13+ · language); two actions (Details, Seen it). Auto-rotates every 8 s, pausing on focus or hover.
  - Rails, in order:
    - "Continue / Recently added from your imports"
    - "For you · Movies"
    - "For you · Anime"
    - "Because you liked X" (cross-media, mixed tile shapes)
    - "Top 10 in India this week" (TMDB trending)
    - "Albums for your watchlist mood"
    - "Games like your favourite show"
  - Tile shapes: posters 2:3 for film/TV/anime, squares for music, capsules (roughly 460:215) for games.
- **Media tabs:** the same shell with a medium-specific chip bar (genres/languages/platforms) and a medium-filtered hero. Music tab: charts + "Mixes". Games tab: "Short games under 10 h" using RAWG playtime / IGDB time-to-beat.
- **Title detail (Apple × Steam):**
  - Full-bleed backdrop with an editorial header: title, then tagline in italic, then meta chips.
  - Sections, one idea per viewport:
    1. Overview (spoiler-safe)
    2. "Why it's here for you": facet chips + explanation sentence
    3. "Where to watch in India": provider logos grouped Stream / Rent / Buy, with a link to the TMDB watch page and an inline "Availability data by JustWatch" credit
    4. Tags (Steam-style, weight shown by chip tone)
    5. Cast row
    6. "Across media": nearest anime/album/game
  - Up-next column on the right at ≥1280 px.
- **Artist/Album:**
  - Square art, mono metadata (year · tracks · length), TrackRow list with a play button for 30-s previews.
  - MiniPlayer: 64 px bar docked at the bottom with art, title, artist, a progress bar (emerald), play/pause, and "Open in Deezer/Apple Music". It persists across routes. Previews stop at 30 s, and expired preview URLs refresh via the API.
- **Game page:** capsule header, platform chips, time-to-beat (main / main+extras / completionist when IGDB has it; otherwise RAWG average playtime, labelled as such), tag cloud, rating summary bar, "Data from RAWG" link and IGDB credit.
- **Search:** a large input; a YouTube-style chip bar (All · Movies · Shows · Anime · Music · Games · Available in India · Under 2 h); results grouped by medium with "See all"; keyboard-first (↓ moves into results).
- **Profile/taste:**
  - a "Your taste" facet radar shown as **a ranked bar list, not a radar chart**
  - top facets with examples per medium
  - consumed counts per source
  - "Not interested" list
  - an export JSON button
- **Import flow:** four cards (Netflix CSV, Letterboxd ZIP/CSV, AniList username, Steam ID). Each shows the steps to get the file, an upload or username field, a progress bar, and a result summary ("Matched 412/450, 38 unmatched — review"). Matched items join the consumed set immediately.

**Breakpoints:**
- phone < 640
- tablet 640–1023
- laptop 1024–1599
- wide ≥ 1600
- **TV mode** when `?tv=1`, or `(hover: none) and (min-width: 1280px)`, or the user toggles it in Profile. TV mode applies:
  - a 1.4x type scale
  - 5% overscan padding
  - Norigin focus
  - no hover-only affordances

**Accessibility:**
- WCAG 2.2 AA contrast (above)
- all actions keyboard-reachable
- `aria-roledescription="carousel"` on the hero with pause control
- rails as `role="list"`
- alt text = title + year
- MiniPlayer controls labelled
- reduced-motion respected
- 44 px minimum touch targets

**Performance targets:**
- Core Web Vitals "good": LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Images:
  - use a **custom next/image loader** that maps widths to TMDB sizes (`w185`, `w342`, `w500`, `w780`, `w1280`) and IGDB sizes (`t_cover_big`, `t_screenshot_big`), so you don't burn Vercel Hobby's image-optimization quota
  - give every image explicit width/height or aspect-ratio boxes
  - only the hero gets priority
  - rails lazy-load
- Skeletons match final tile shapes.
- Rails render server-side with cached data; the hero backdrop is preloaded.

**Component primitives:**
- **Radix Primitives or React Aria Components** for Dialog/Tabs/Tooltip/Popover, styled entirely with our tokens. React Aria is stronger for keyboard and focus.
- **Embla v8** for the hero only.
- **Native CSS scroll-snap** for rails: lighter, and easier to pair with roving focus.
- **Motion 14** for focus/expand and route transitions.
- **Phosphor icons**, one weight.
- **Avoid:** shadcn/ui default blocks, which are the strongest "AI look" signal.

### 7.5 "Must not look AI-made": tells and counter-rules

Design commentary in 2025–26 converges on the same fingerprint:
- Alan West (DEV) calls it "the Purple Problem": "a purple gradient, Inter font, rounded cards with subtle shadows, and three feature boxes with icons arranged in a grid". He traces it to Tailwind UI's `bg-indigo-500` defaults.\[65\]
- Joshua Snoddy lists "the Inter typeface, a violet-to-indigo gradient, glass cards with soft shadows, a centred hero, and shadcn/ui blocks in the same order".\[66\]
- SCALR's "20 Signs a Website Was Made by AI" adds "emojis in headings", "frosted-glass cards", "badge above the headline", "sections fading in" and "a glow following the cursor".\[67\]
- Anthropic's own frontend-design guidance warns against "Overused font families (Inter, Roboto, Arial, system fonts)" and "purple gradients on white backgrounds".\[68\]

| Tell | Rule in Understory |
|---|---|
| Purple/indigo/blue gradients | Default palette deleted; gradients only for the hero scrim and one brand glow token |
| Inter/Geist/system font everywhere | Bricolage + Instrument + Plex Mono; lint rule bans `font-sans` defaults |
| Default shadcn cards, `rounded-2xl shadow-md` everywhere | Tiles 6 px, cards 10 px; no shadows except focus |
| Identical 3-card feature grids | Never on browse; layouts follow content shape (poster/square/capsule) |
| Emoji/sparkle icons, "✨ AI-powered" | No emoji; never call out "AI" in UI copy; explanations cite facets instead |
| Glassmorphism overuse | One blur, TopNav only |
| Generic hero copy ("Discover your next favorite") | Hero line is always data-derived ("Because you rewatched *Arcane*") |
| Fade-in-on-scroll on every section | One scroll reveal per detail section, none on browse pages |
| Badge pill above headline, cursor glow | Banned |
| Lorem-ish marketing filler | Empty states show real next actions ("Import Letterboxd to hide 300 films you've seen") |

**Prompt to enforce the design system (prefix to every UI task):**
```text
Follow docs/DESIGN.md (Understory) strictly. Use only tokens defined in globals.css @theme; if you need a value that doesn't exist, STOP and propose a token instead of inventing one. Banned: Tailwind default colours, arbitrary hex, Inter/Geist/system fonts, emoji, sparkle icons, gradients other than `scrim` and `canopy-glow`, rounded-2xl/3xl, shadow-* except `shadow-focus`, three-equal-card feature grids, marketing copy. Every interactive element: visible :focus-visible state with ring-signal and keyboard/arrow access. After implementing, list every class you used that is not a token and justify or remove it.
```

**Design-critique prompt (run on screenshots in Claude Code, and later in the Gemini app or AI Studio):**
```text
You are a senior product designer reviewing screenshots of "Canopy", a cross-media recommender with a dark green design language (docs/DESIGN.md attached/available). Critique harshly and specifically:
1) Where does it look AI-generated/template-like? Cite the exact element.
2) Hierarchy: what does the eye hit first, second, third? Is that right?
3) Token violations: colours, radii, fonts, spacing off-scale.
4) Focus/TV usability: is the focused item unmistakable at 3 m distance?
5) Copy: list every generic phrase and rewrite it with data-specific wording.
Output: a prioritised list of max 10 fixes, each with the file/component likely responsible and the exact change.
```

**Your own taste matters most:**
- Spend 45 minutes on Day 1 (in the Window A/B gap) building a Figma moodboard with 3 frames:
  1. "Browse": screenshots of TV-style rails you like.
  2. "Detail": editorial product pages.
  3. "Not this": AI-looking UIs you dislike.
- Pick **your** hero layout, tile shape and accent usage. Write 5 sentences in docs/DESIGN.md under "Rhian's calls".
- That paragraph is also a great interview answer about product judgement.
- Keep moodboard screenshots as private references only. Don't commit third-party screenshots to a public repo.

---

## 8. Day-by-day plan (1–9 Nov) with copy-paste prompts

**Reusable prompts** (save them as `.claude/commands/*.md`):

```text
/plan-task — Task: $ARGUMENTS. Enter plan mode. Read AGENTS.md and only the files you need. Output: (1) files to create/modify, (2) step list, (3) tests to add, (4) risks, (5) "Done when" checklist. Wait for "go".
```
```text
/review-diff — Review `git diff --staged` (or the last commit) as a strict senior reviewer: correctness, edge cases, security (secrets, injection, CORS), AGENTS.md rule violations, design-token violations, missing tests. Output a numbered list of issues with severity and the fix; then apply only the fixes I approve.
```
```text
/debug — Bug: <symptom + exact error + command>. Reproduce it first with a failing test or a minimal command. State 2–3 hypotheses ranked by likelihood, check the cheapest first, then fix the root cause (no try/except band-aids). Show the failing→passing test.
```
```text
/write-tests — For <module>, write pytest tests covering: happy path, empty input, rate-limit 429 + Retry-After, malformed upstream JSON, and one property-style test. Use recorded fixtures in tests/fixtures/, no live network.
```
```text
/defend — Explain today's code (git log since this morning) as if I'm in an interview for an ML engineer role. For each component: what it does, why this design over 2 alternatives, complexity, failure modes, and how I'd test it. Then ask me 5 hard interviewer questions one at a time, wait for my answer, grade it, and give the ideal answer. Finally write a 10-line summary into docs/LEARNING.md under today's date in MY voice (first person, simple words).
```
```text
/handover — Update docs/HANDOVER.md (state, how to run, known issues, changelog entry for today) and docs/NEXT.md (the exact next 3 tasks as ready-to-paste prompts). Commit with "docs: handover <date>".
```

### Day 1 — Sun 1 Nov: setup, repo generation, design system
**Goals:** tools installed; repo scaffolded; tokens + fonts + app shell; DESIGN.md.
**Manual (morning):**
- Section 5 commands.
- Request API keys now. TMDB/Twitch approval can take time.
- Moodboard in the gap.

**Prompts (in order):**
1. The master prompt (6.2), pasting AGENTS.md from 6.3 when it asks.
2. Design system:
```text
/plan-task Implement the Understory design system. Source: docs/DESIGN.md (create it from the spec I paste below). Build packages/tokens/tokens.json with the exact colours, type scale, spacing, radii, motion and focus tokens; build.mjs generates the @theme block (with `--color-*: initial; --font-*: initial;`) and light-mode overrides under [data-theme="light"]. Load Bricolage Grotesque, Instrument Sans, IBM Plex Mono via next/font/google. Create a /dev/tokens page (dev-only) rendering every token swatch with its contrast ratio vs bg computed at runtime.
Done when: /dev/tokens shows all tokens; contrast for text-1/text-2/text-3/mint/emerald matches the table (±0.2); no Tailwind default colour class exists in the repo; `just lint` passes.
<paste Section 7.2–7.3>
```
3. App shell:
```text
/plan-task Build the app shell: TopNav (wordmark placeholder, pill tabs Home/Movies/Shows/Anime/Music/Games, search button, profile), Rail, Tile (poster|square|capsule|landscape variants), Top10Tile, Skeleton, Hero (Embla v8, autoplay 8s, pauses on focus/hover, reduced-motion safe). Home renders with 6 rails of placeholder data from apps/web/public/snapshots/home.json. Keyboard: arrow keys move within a rail (roving tabindex), up/down between rails, focused tile scales 1.06 with ring-signal. TV mode (?tv=1) initialises Norigin spatial navigation.
Done when: Playwright test navigates 3 tiles right and 1 rail down via keyboard and asserts focus; Lighthouse (local) accessibility ≥ 95; looks correct at 375px, 1280px, 1920px.
```
**Tests:** `just test`, `just lint`, `pnpm -C apps/web exec playwright test`.
**Commit:** `feat(web): understory tokens + shell`.
**Evening:** run `/defend`, then `/handover`.
**Fallback:** if behind, skip the Hero (use a static first tile) and TV mode, and keep tokens + Rail.

### Day 2 — Mon 2 Nov: schema + TMDB movies/TV + India providers
```text
/plan-task Create db/migrations 0001–0003 per docs/ARCHITECTURE.md schema (I paste it below). Then implement services/api ingest/http.py: async httpx client with per-source token-bucket limiter, exponential backoff honouring Retry-After, on-disk JSON cache keyed by URL+body (data/cache/), descriptive User-Agent. Tests with fixtures for 200, 429+Retry-After, 5xx retry, cache hit.
Done when: `just migrate` applies cleanly on a fresh DB; http tests pass offline.
<paste schema from section 9.2>
```
```text
/plan-task Implement ingest/tmdb.py + normalize.py: fetch top ~1500 movies and ~1000 TV (discover sorted by popularity with region=IN plus trending/week), then details with append_to_response=keywords,external_ids,watch/providers; store works, external_ids, tags (genres+keywords), availability rows for watch_region IN only (flatrate/rent/buy/free/ads, provider_id, provider_name, logo_path, link=TMDB watch URL). Build a "vibe_text" per work: title, year, genres, top keywords, 1-sentence spoiler-safe overview trimmed to 300 chars. CLI: `just ingest tmdb --limit 200` for a dry run.
Done when: DB has ≥2,000 TMDB works with poster_path; ≥60% of movies have ≥1 IN availability row (report actual %); tests use fixtures; README credits section updated.
```
```text
/plan-task Build title/[id] detail page (live API) per Section 7.4: DetailHeader, Availability grouped Stream/Rent/Buy with provider logos + "Availability data by JustWatch" credit + link to TMDB watch page, TagCloud, cast row placeholder. Add FastAPI GET /works/{id} and GET /works?media=&limit=. Add About page with TMDB logo and the notice "This product uses the TMDB API but is not endorsed or certified by TMDB."
Done when: 3 random movies render with correct IN providers; About page lists TMDB + JustWatch.
```
**Fallback:** movies only; TV moves to Day 3's morning.

### Day 3 — Tue 3 Nov: anime (AniList) + games (IGDB/RAWG)
```text
/plan-task Implement ingest/anilist.py: POST https://graphql.anilist.co, paged Media(type: ANIME, sort: POPULARITY_DESC, perPage: 50) for 1000 items with id, idMal, title{romaji english native}, description(asHtml:false), genres, tags{name rank isMediaSpoiler}, coverImage{extraLarge color}, bannerImage, seasonYear, episodes, format, averageScore, popularity. Limiter: ≤25 requests/min (API degraded to 30/min), honour Retry-After, 1-minute backoff on 429. Exclude tags with isMediaSpoiler=true from vibe_text and UI. Map to works(media_type='anime'), keep idMal in external_ids; if a TMDB id is cross-referenceable later, leave a TODO.
Done when: 1000 anime ingested in <5 min without a 429 loop; spoiler tags never stored in public tag list.
```
```text
/plan-task Implement ingest/igdb.py: client-credentials token from https://id.twitch.tv/oauth2/token (cache until expiry), POST https://api.igdb.com/v4/games with Apicalypse body: fields name,summary,genres.name,themes.name,keywords.name,platforms.abbreviation,cover.image_id,first_release_date,total_rating,total_rating_count,game_modes.name,player_perspectives.name; where total_rating_count > 50 & version_parent = null; sort total_rating_count desc; limit 500; offset N. Limiter ≤4 req/s, ≤8 in flight. Try the time-to-beat endpoint (verify its current name in IGDB docs) for the top 300. Then ingest/rawg.py as enrichment: match by name+year, store rawg id, playtime (avg hours), rating, and a rawg_url for the mandatory backlink. Budget: ≤3,000 RAWG requests total.
Done when: ≥1000 games with cover; game/[id] page shows capsule, platforms, tags, time-to-beat or "Avg playtime (RAWG)", RAWG link + IGDB credit.
```
**Fallback:** if Twitch approval is slow, use RAWG only (list endpoint `GET https://api.rawg.io/api/games?key=…&ordering=-added&page_size=40`).

### Day 4 — Wed 4 Nov: music + unified search + first preview deploy
```text
/plan-task Music slice. ingest/deezer.py: GET https://api.deezer.com/chart/0/tracks?limit=100, /chart/0/albums, /chart/0/artists, /artist/{id}/top?limit=10, /album/{id}. ingest/itunes.py: GET https://itunes.apple.com/search?term=<q>&entity=song|album&country=IN&limit=25 for an India seed list (top Hindi/Tamil/Telugu/Punjabi artists I'll provide in data/seeds/india_artists.txt), ≤20 req/min. ingest/lastfm.py: artist.gettoptags and artist.getsimilar for tags. ingest/musicbrainz.py: optional MBID lookup by ISRC at ≤1 req/s with User-Agent from env. Do NOT store preview URLs long-term (Deezer URLs are signed and expire): store track ids; add GET /music/preview/{source}/{id} that fetches a fresh preview URL with a 10-minute cache. Works for music: media_type in ('album','artist','track'); rails use albums+artists, MiniPlayer plays tracks.
Done when: ≥1,500 music works; artist and album pages render; MiniPlayer plays 30 s and persists across navigation; credits show Deezer/Apple + "Open in…" link.
```
```text
/plan-task Unified search: Postgres full-text (simple config + unaccent if available) over title/alt_titles + pg_trgm similarity fallback for typos; GET /search?q=&media=&in_india=. Web: search page with ChipBar (All, Movies, Shows, Anime, Music, Games, Available in India), grouped results, keyboard flow. Then scripts/export_snapshot.py writes home.json, top works per tab, and 200 detail JSONs into apps/web/public/snapshots; API_MODE=snapshot works fully offline.
Done when: "naruto", "interstellar", "arijit", "hollow knight" each return the right top hit; `API_MODE=snapshot pnpm -C apps/web build` succeeds.
```
**Manual:** `cd apps/web && vercel` (log in, deploy a preview in snapshot mode). That gives you a public URL even if everything else slips.

### Day 5 — Thu 5 Nov: recommender v1 (heavy day; use the strongest model for the plan)
```text
/plan-task Recommender v1 — design first, then implement. Components:
(1) rec/embed.py: local sentence-transformers on Apple Silicon (device="mps"), small English model with 384-dim output (propose 2 candidates with trade-offs), embed works.vibe_text in batches of 64, store in work_embeddings(vector(384)); HNSW index cosine. Runs only locally (ml dependency group).
(2) rec/facets.py: controlled vocabulary of ~60 facets in services/api/src/canopy/rec/facets.yaml (e.g. found_family, cold_lead, slow_burn, lightning_powers, flight, weak_to_op, heist, time_loop, melancholic, cozy, neo_noir, cyberpunk, coming_of_age, morally_grey, underdog_sports, synthwave_mood, epic_orchestral, roguelike_loop, open_world_wander). Rule mapping from AniList tags/TMDB keywords/IGDB themes/Last.fm tags → facets. Optional LLM pass (Gemini Flash free tier via GEMINI_API_KEY) for the top 300 per medium, JSON-schema output restricted to the vocabulary, cached in work_facets with source='llm'.
(3) rec/profile.py: profile vector = weighted mean of liked/rated items' embeddings (rating-weighted, recency-decayed, half-life 180 days) + facet histogram.
(4) rec/rank.py: candidates = top 300 by ANN for the target media_type; score = 0.55*cos + 0.25*facet_jaccard + 0.10*log-popularity prior (normalised per medium) + 0.10*quality; then rec/mmr.py with λ=0.7 to pick 20.
(5) rec/exclude.py: hard SQL filter (NOT EXISTS consumed/dismissed) applied BEFORE ranking and asserted AFTER.
(6) rec/explain.py: template "Shares {f1} and {f2} with {anchor}" choosing the anchor = liked item with max cosine to the candidate; never use spoiler tags.
Endpoints: GET /recs/home?profile_id=, GET /recs/because/{work_id}?target=anime|movie|tv|album|game.
Tests: tests/test_exclusion.py (property test: random profiles, no consumed id ever returned), MMR reduces near-duplicates, explanation never empty.
Done when: a seeded demo profile (5 liked items across media) gets 5 non-empty cross-media rails in <300 ms server time locally; exclusion test passes.
```
```text
Explain the scoring formula and MMR you just wrote with a tiny worked example (3 candidates, numbers), then add that example as a docstring and a unit test.
```
**Then:** `just embed` (locally, roughly 10–20 min for about 7k items on M-series; time it and note it in LEARNING.md).
**Fallback (light):** cosine + exclusion + templates only; facets from rules only.

### Day 6 — Fri 6 Nov: UI screens + TV mode
```text
[Prefix with the design-enforcement prompt]
/plan-task Wire Home to /recs/home: hero = top-scored item with its explanation line; rails per Section 7.4 order; "Because you liked X" rail with mixed tile shapes; Top 10 India rail with numerals. Media tabs with chip bars (languages for Movies/Shows; formats for Anime; platforms for Games). Profile page: ranked facet bars, consumed counts, "Not interested" list, TV-mode toggle, light/dark toggle. "Seen it" and "Not interested" actions on tiles (long-press/menu key) POST /events and remove the tile with a 160ms exit.
Done when: all 5 tabs render real data; keyboard-only walkthrough Home→Anime tab→detail→back works; Playwright covers it; CLS < 0.1 locally.
```
```text
Take screenshots at 375, 1280 and 1920 (?tv=1) of Home, a title page, an artist page, a game page and search using Playwright, save to docs/screens/<date>/. Then run the design-critique prompt on them yourself and fix the top 5 issues.
```
**Manual:** run the design-critique prompt yourself in the Gemini app on the same screenshots (a second opinion), and make your own 3 changes by hand.

### Day 7 — Sat 7 Nov: imports + local profiles
```text
/plan-task Imports. Local profiles: profile UUID in an httpOnly cookie, created on first visit; profiles table; events table (view, like, rate, seen, dismiss). Importers (pure functions + API endpoints + UI cards):
- Netflix "ViewingActivity"/viewing history CSV (columns Title, Date): strip ": Season X: Episode" suffixes, collapse to shows; match to TMDB works by normalised title (+ year when present).
- Letterboxd export: watched.csv and ratings.csv (Date, Name, Year, Letterboxd URI, Rating) → match by title+year.
- AniList by username: MediaListCollection(userName, type: ANIME) { lists { entries { status score media { id } } } } → exact id match.
- Steam: IPlayerService/GetOwnedGames (key, steamid, include_appinfo=1) → match via IGDB external ids or name.
imports/match.py: rapidfuzz-free implementation is fine (trigram via Postgres similarity()). Every matched item → events(kind='seen') so exclusion applies immediately. Show matched/unmatched counts and an unmatched review list.
Done when: sample files in tests/fixtures/imports/ import with ≥85% match on my real exports (report %); exclusion test extended to imported items; no raw import file is stored after processing.
```
**Manual:** download your real Netflix, Letterboxd and Steam data and test against it. Keep it in `data/` (gitignored).
**Fallback:** Netflix + Letterboxd only. AniList/Steam become the first Antigravity tasks.

### Day 8 — Sun 8 Nov: deployment, then GitHub push + README
**Manual first:**
- Create the Supabase project (region: Mumbai/ap-south-1 if offered).
- Enable `vector` and `pg_trgm`.
- Copy the **pooler** connection string.

```text
/plan-task Deployment. (1) scripts/push_to_supabase.sh: run db/migrate.sh against $SUPABASE_DB_URL, then pg_dump --data-only of works/external_ids/tags/facets/availability/embeddings from local and restore; print row counts both sides. (2) services/api Dockerfile (python:3.12-slim, uv sync --no-dev --frozen, uvicorn on $PORT), /health endpoint, CORSMiddleware with CORS_ORIGINS env. (3) render.yaml for a free web service. (4) apps/web: NEXT_PUBLIC_API_BASE env, fetch with revalidate=3600 for rails, a "Waking the recommender…" skeleton state when the API takes >3 s, automatic fallback to snapshot data on API error. (5) .github/workflows: ci.yml (lint+tests), keepalive.yml (daily cron: curl API /health and run one SELECT via psql against Supabase so the free project doesn't pause).
Done when: DB size on Supabase < 200 MB; local web pointed at Render API works; fallback verified by stopping the API.
```
**GitHub push:**
```bash
cat .gitignore | grep -E "\.env|data/|node_modules|\.venv"   # all four must appear
gitleaks git -v            # (older versions: gitleaks detect -v) — must report no leaks
git status --ignored | head -50
gh auth login
gh repo create canopy --private --source=. --remote=origin --push
```
**Then:**
- Render: New → Blueprint from repo; set env vars:
  - `DATABASE_URL` (Supabase pooler)
  - `CORS_ORIGINS=https://<your-app>.vercel.app,http://localhost:3000`
  - `API_MODE=live`
- Vercel: import the repo (root `apps/web`); set `NEXT_PUBLIC_API_BASE` and `API_MODE=live`.
- Add GitHub secrets for keepalive.
- Optional domain: add it in Vercel → Domains.

```text
Write README.md: one-paragraph pitch, 3 screenshots from docs/screens, architecture diagram (mermaid), "How recommendations work" (formula + exclusion), local setup in ≤10 commands, data sources & attribution section, "Built with AI assistance" section (honest: Claude Code for scaffolding, I designed X, decided Y, wrote/rewrote Z), roadmap link, MIT license note excluding third-party data.
```
**Fallback:** if Render or Supabase fights you, ship Vercel in snapshot mode and move the backend deploy to the first Antigravity task.

### Day 9 — Mon 9 Nov: polish + handover (Claude ends today)
```text
/plan-task Final polish pass, max 8 fixes: run Lighthouse on the deployed Home and a title page; fix the top LCP/CLS issues (image sizes, priority, font-display); verify every page's attribution; 404 and error states in brand voice; check keyboard-only + ?tv=1 flows on the deployed URL.
```
```text
Write handover for a different AI agent (Antigravity/Jules) that has never seen this repo: docs/HANDOVER.md (architecture map with every important file, how to run/test/deploy, env vars, known bugs, limits of free tiers, data-source rules), docs/ROADMAP.md (milestones Dec 2026–Mar 2027), docs/BACKLOG.md (top 20 tasks, each a self-contained prompt with files, acceptance criteria, and test command), docs/DECISIONS.md (ADRs 001–010 from git history). Then verify AGENTS.md: run every command it lists and fix anything stale. Commit and push.
```
**Manual:**
- Install `agy`, open the repo, and run the "session start" prompt (Section 4) to confirm the handover reads cleanly.
- Connect Jules to the GitHub repo and give it one tiny test task.

---

## 9. Data and recommender implementation details

### 9.1 Sources, query shapes, limits, attribution

| Source | Key calls | Limit handling | Attribution UI |
|---|---|---|---|
| TMDB | `/3/discover/{movie,tv}?region=IN&sort_by=popularity.desc&page=N`; `/3/trending/{movie,tv}/week`; `/3/{movie,tv}/{id}?append_to_response=keywords,external_ids,watch/providers`; images `image.tmdb.org/t/p/{w342,w780,w1280}` | Limiter at 20 req/s, well under the ceiling TMDB's Rate Limiting docs give ("somewhere in the 40 requests per second range… could change at any time"); honour 429s; disk cache | TMDB logo + notice on About; "Availability data by JustWatch" next to providers;\[69\] link to the TMDB watch page |
| AniList | GraphQL `Page{media(type:ANIME,sort:POPULARITY_DESC)}`; `MediaListCollection(userName)` | ≤25/min, Retry-After, 1-min timeout on 429; send a real User-Agent (Cloudflare blocks generic clients) | "Data from AniList" |
| IGDB | `POST /v4/games` (Apicalypse), `/v4/covers`, time-to-beat endpoint | ≤4 req/s, ≤8 open; batch with `limit 500` | "Game data: IGDB.com" |
| RAWG | `/api/games?ordering=-added&page_size=40`, `/api/games/{id}` | ≤20k/month; cache forever locally | Active hyperlink to RAWG on every page using its data |
| Deezer | `/chart/0/{tracks,albums,artists}`, `/artist/{id}/top`, `/album/{id}`, `/track/{id}` (preview) | Polite limiter (exact limits unverified); never persist preview URLs | "Previews by Deezer" + Open-in link |
| iTunes Search | `/search?term=&entity=song|album&country=IN` → `previewUrl`, `artworkUrl100` (resize in URL) | ≤20/min (Apple: "approximately 20 calls per minute (subject to change)") | "Previews courtesy of Apple Music" + link to the store page (verify Apple's current preview/marketing terms) |
| MusicBrainz | `/ws/2/recording?query=isrc:<ISRC>&fmt=json`, `/ws/2/artist/{mbid}?inc=tags` | 1 req/s; User-Agent `Canopy/0.1 (you@mail)` | "Metadata: MusicBrainz (CC0)" |
| Last.fm | `artist.gettoptags`, `artist.getsimilar`, `tag.gettopartists` | ≤5 req/s and non-commercial only, per API Evangelist's third-party summary of Last.fm's ToS | "Tags via Last.fm" plus "powered by AudioScrobbler" |
| Steam | `IPlayerService/GetOwnedGames` | User's key, public profile | — |

**TMDB and AI caveat:** one summary of TMDB's terms (read 24 Oct 2026) lists "no AI training on TMDB content".\[27\] Computing retrieval embeddings and facet labels for a non-commercial app is arguably not "training", but it's a grey area. Don't fine-tune any model on TMDB text. Keep the project non-commercial. Log this in DECISIONS.md, and build vibe_text mostly from structured fields (genres/keywords) rather than full overviews.

### 9.2 Unified schema (0001–0003)

```sql
CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TYPE media_type AS ENUM ('movie','tv','anime','album','artist','track','game');
CREATE TABLE works (id bigserial PRIMARY KEY, media media_type NOT NULL, title text NOT NULL,
  alt_titles text[] DEFAULT '{}', year int, overview text, vibe_text text, image_url text,
  backdrop_url text, popularity real, quality real, runtime_min int, extra jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(), search tsvector);
CREATE TABLE external_ids (work_id bigint REFERENCES works ON DELETE CASCADE, source text, ext_id text,
  url text, PRIMARY KEY (source, ext_id));
CREATE TABLE tags (work_id bigint REFERENCES works ON DELETE CASCADE, tag text, kind text, weight real DEFAULT 1,
  spoiler boolean DEFAULT false, PRIMARY KEY (work_id, tag, kind));
CREATE TABLE facets (work_id bigint REFERENCES works ON DELETE CASCADE, facet text, score real,
  source text CHECK (source IN ('rule','llm')), PRIMARY KEY (work_id, facet));
CREATE TABLE availability (work_id bigint REFERENCES works ON DELETE CASCADE, region text DEFAULT 'IN',
  offer text, provider_id int, provider_name text, logo_path text, link text, fetched_at timestamptz DEFAULT now());
CREATE TABLE work_embeddings (work_id bigint PRIMARY KEY REFERENCES works ON DELETE CASCADE,
  model text, emb vector(384));
CREATE TABLE profiles (id uuid PRIMARY KEY, created_at timestamptz DEFAULT now(), settings jsonb DEFAULT '{}');
CREATE TABLE user_events (id bigserial PRIMARY KEY, profile_id uuid REFERENCES profiles, work_id bigint REFERENCES works,
  kind text CHECK (kind IN ('view','like','rate','seen','dismiss')), value real, source text, at timestamptz DEFAULT now());
CREATE TABLE imports (id bigserial PRIMARY KEY, profile_id uuid REFERENCES profiles, source text,
  matched int, unmatched int, report jsonb, at timestamptz DEFAULT now());
-- 0002: CREATE INDEX ON work_embeddings USING hnsw (emb vector_cosine_ops);
--       CREATE INDEX ON works USING gin (search); CREATE INDEX ON works USING gin (title gin_trgm_ops);
```

### 9.3 Cross-media recommendation, fast
- **Shared space:** every work gets a normalised **vibe description** with the same template across media:
  - `"<medium>. Mood: … Themes: … Setting: … Pace: … Tags: …"`
  - built from genres/tags/themes plus short summaries
  - This is what makes a film, an anime and an album land near each other.
- **Embeddings:** local sentence-transformers on MPS.
  - It's free, private, and has no quota.
  - Gemini embedding on the free tier was last documented at about 1,000 requests/day, Google now shows limits only per project in AI Studio, and free-tier data may be used by Google.\[49\]\[50\]\[51\]
  - Local wins for the seed. Switch to Gemini embeddings later only if quality demands it.
- **Facets:** rules first (deterministic, testable); LLM facets for about 300 seeds per medium on Gemini Flash's free tier, constrained to the vocabulary and cached.
- **Ranking:** cosine + facet Jaccard + popularity prior + quality, then MMR (λ = 0.7), with hard exclusion before and after.
- **Explanations:** templates now; LLM grounded explanations later (catalog-grounded, spoiler tags removed).
- **Postponed:** EASE^R (needs interaction data you don't have yet; use MovieLens/AniList list dumps later), the LLM reranker, NDCG@10 on a temporal split of your own imports, and the user study.

### 9.4 Seed sizes (fit Supabase's 500 MB)

| Medium | Seed | Approx. rows incl. tags/availability |
|---|---|---|
| Movies | 1,500 | ~30k tag rows, ~6k availability rows |
| TV | 1,000 | ~20k tags, ~4k availability |
| Anime | 1,000 | ~15k tags |
| Music | ~2,000 (300 artists, 700 albums, 1,000 tracks) | ~10k tags |
| Games | 1,000 | ~15k tags |

Embeddings: about 6.5k × 384 float4 ≈ 10 MB, plus an HNSW index of a similar order. The whole DB should be under about 150 MB, leaving room for events and imports. Neon's free plan gives 1 GB per project if you ever outgrow Supabase.

---

## 10. Deployment on free tiers (Nov 2026)

| Layer | Pick | Why | Watch-outs |
|---|---|---|---|
| Frontend | **Vercel Hobby** | Best Next.js 16 support; you have an account; CLI deploys from local | Non-commercial only; image optimization capped at 1,000 source images (use the custom loader); cron once per day\[47\]\[48\] |
| Alt frontend | Netlify / Cloudflare Pages | Both allow commercial use on free (per a comparison table)\[48\] | Next.js 16 features may lag; not needed now |
| Backend | **Render free web service** | Git-based Docker deploy, no card, 750 h/month\[70\] | Spins down after 15 min idle, about 1 min cold start; 512 MB / 0.1 CPU; ephemeral disk. Hence no ML at runtime, plus a snapshot fallback\[45\]\[70\] |
| Alt backend | Google Cloud Run / Koyeb / HF Spaces | Possibly fewer cold-start pains | Free-tier terms not verified this session; Cloud Run needs a billing account |
| Database | **Supabase Free** | pgvector, you have the connector, 500 MB is enough | Pauses after 1 week of low activity (keepalive workflow); 2 projects max; no backups (keep local `pg_dump`)\[42\] |
| Alt DB | Neon Free | 1 GB/project, 100 CU-h, scale-to-zero after 5 min\[71\] | Cold start on first query after idle\[72\] |
| Cron | GitHub Actions | Daily keepalive + weekly refresh | Per GitHub Docs, scheduled workflows in a public repo are auto-disabled after 60 days without repository activity; your commits and the daily keepalive count as activity |

**Env vars:**
- web: `NEXT_PUBLIC_API_BASE`, `API_MODE`
- api: `DATABASE_URL`, `CORS_ORIGINS`, plus source keys only if you ingest from the server (you don't; ingestion stays local)
- Never expose source keys to the browser.

**Avoid Render's free Postgres:** it expires after 30 days.

---

## 11. Resume and interview safety

- **DECISIONS.md (ADR format):** context, then options, then decision, then consequences. Examples:
  - ADR-003 "Local embeddings vs Gemini embeddings"
  - ADR-005 "Hard exclusion before and after ranking"
  - ADR-007 "Spotify excluded after Feb 2026 policy"
- **LEARNING.md (daily, 10 lines, your words):** what you built, one concept you learned (HNSW, MMR, token bucket, Retry-After), one bug and its root cause, one thing you'd do differently.
- **Every evening:** run `/defend`. Answer its 5 questions **without looking**, then compare.
- **Code you must be able to whiteboard:**
  1. the scoring formula + MMR
  2. the exclusion filter and its property test
  3. the token-bucket limiter
  4. the import matcher
  5. why embeddings are precomputed offline
- **Honesty script:** "I used Claude Code as a pair programmer for scaffolding and boilerplate. I made the architecture, data-source and design decisions, wrote the ADRs, and I can walk you through every module. Here's a bug I fixed myself and why." Never claim you hand-wrote everything; interviewers now probe for this. Own the decisions and the understanding.
- **Commit hygiene:** small conventional commits that show progression. Don't squash the history into one giant AI commit.

---

## 12. After 9 Nov: prioritized "what to add next" backlog

1. **Evaluation harness (Dec):** temporal split on your own imports plus MovieLens/AniList public lists; NDCG@10/Recall@20; compare cosine vs cosine+facets vs EASE^R. *Highest resume value.*
2. **EASE^R baseline + hybrid blend** with learned weights (simple grid search on validation).
3. **Grounded LLM explanations + catalog-grounded reranker** (Gemini via API; strict JSON; spoiler filter; cite facets).
4. **Watchlists + "seen" sync**, with real auth (Supabase Auth).
5. **Conversational recommender:** "something like Arcane but cozier, under 2 hours", parsed to facets and filters.
6. **Agentic layer with tool calling:** tools for search_catalog, get_availability_IN, get_user_profile and explain. An eval set of 50 queries. *This is your GenAI/agentic interview story.*
7. **Social:** friends, and group "blend" (aggregate profiles with a least-misery/average strategy) for movie nights.
8. **Browser extension:** "seen it" capture on Netflix/JioHotstar pages (respect site terms; client-side only).
9. **Native TV app:** React Native for Android TV/tvOS reusing the API (a later, larger project).
10. **User study (n≈20 classmates) + short paper/blog:** cross-media facet-based recommendation, with a well-documented negative result if needed.

---

## Caveats
- **Unverified or conflicting:**
  - exact Claude model names on Pro and per-window prompt counts
  - the Claude Pro INR price (₹1,999 vs ₹2,000 annual vs ₹2,399 monthly)
  - Firebase Studio status
  - Deezer commercial terms and rate limits; Last.fm terms (only a third-party summary was checked)
  - IGDB's time-to-beat endpoint name
  - Apple preview usage terms
  - Cloud Run/Koyeb/HF free tiers
  - the exact Motion/Norigin patch versions
- **Antigravity CLI** is new, closed-source and changing fast. Its context-file precedence (`.antigravity.md` over `GEMINI.md`) comes from third-party guides; test it on Day 9.\[73\]
- **Realism:** 7,000 titles across five media, imports, a recommender and two deploys in 9 days only works because each slice is thin. If Days 2–4 slip, cut breadth (fewer items), never the exclusion test or attribution.
- **Licensing:** everything here assumes a **non-commercial** portfolio project. Ads, payments or a startup pivot would trigger TMDB, Vercel Hobby, IGDB and possibly Deezer/RAWG commercial terms.

## Sources

1. [An important update: Transitioning Gemini CLI to Antigravity CLI · google-gemini/gemini-cli · Discussion #27274 · GitHub](https://github.com/google-gemini/gemini-cli/discussions/27274)
2. [An important update: Transitioning Gemini CLI to Antigravity CLI - Google Developers Blog](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)
3. [Spotify changes developer mode API to require premium accounts, limits test users](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)
4. [Use Claude Code with your Pro, Max, or Ultra plan](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
5. [Claude Usage Limits Explained: Pro, Max and Weekly Limits](https://contextbolt.com/blog/claude-usage-limits/)
6. [Claude Usage Limits 2026: The Complete Guide](https://pranoti.thesciencetalk.com/perspectives/claude-usage-limits-2026-complete-guide/)
7. [Claude Code Usage Limits by Plan: Rate Caps Explained (2026)](https://fast.io/resources/claude-code-usage-limits-guide/)
8. [Claude Code Rate Limits & Usage Quotas Explained (2026)](https://www.truefoundry.com/blog/claude-code-limits-explained)
9. [Claude Pro Price in India: Rs 1,999 in Apps, \$20 on the Web](https://swapbiswas.com/blog/claude-pro-price-in-india/)
10. [Claude India INR Pricing — July 2026](https://explainx.ai/blog/anthropic-claude-inr-pricing-india-july-2026)
11. [Claude price in India (Oct 2026): Pro ≈₹1,906, Max, Team, API](https://productgrowth.in/tools/ai-llm/claude/)
12. [Important Update: Gemini CLI Has Stopped Serving Requests for Individual Accounts #28017](https://github.com/google-gemini/gemini-cli/discussions/28017)
13. [Bye-bye, Gemini CLI; Google's gone and swapped you for a closed-source AI](https://www.theregister.com/ai-ml/2026/05/20/bye-bye-gemini-cli-google-nudges-devs-toward-antigravity/5243605)
14. [Antigravity CLI (agy): Install, Commands, MCP, Update](https://agentpedia.codes/blog/antigravity-cli-deep-dive)
15. [Google Antigravity Rules, Skills, and Workflows Explained](https://iceberglakehouse.com/posts/2026-03-context-google-antigravity/)
16. [Google Jules Pricing 2026: Cost, Limits and Plans - Agentcode](https://agentcode.ai/google-jules-pricing)
17. [Jules - Review & Setup Guide - Developers Digest](https://www.developersdigest.tech/tools/jules)
18. [Next.js 16.4](https://nextjs.org/blog/next-16-4)
19. [Next.js 16 (LTS) - What's New, Support Lifecycle & EOL — VersionLog](https://versionlog.com/nextjs/16/)
20. [Tailwind CSS v4.0 - what's new and how to upgrade](https://fireup.pro/news/tailwind-css-v4-0-released-lightning-fast-builds-advanced-features-and-simplified-setup)
21. [Tailwind CSS — Tailwind CSS — releases.sh](https://releases.sh/tailwind-css/tailwind-css)
22. [motion - npm](https://www.npmjs.com/package/motion)
23. [Changelog - Framer Motion](https://motion.dev/changelog)
24. [Embla Carousel Docs](https://www.embla-carousel.com/docs)
25. [@noriginmedia/norigin-spatial-navigation-react - npm](https://www.npmjs.com/package/@noriginmedia/norigin-spatial-navigation-react)
26. [Release @noriginmedia/norigin-spatial-navigation@3.4.0 · NoriginMedia/Norigin-Spatial-Navigation · GitHub](https://github.com/NoriginMedia/Norigin-Spatial-Navigation/releases/tag/%40noriginmedia/norigin-spatial-navigation%403.4.0)
27. [omnifilm / tmdb](https://packagist.org/packages/omnifilm/tmdb)
28. [GitHub - api-evangelist/tmdb: The Movie Database — independent third-party profile of a public API surface, by API Evangelist. The Movie Database (TMDB) is a community-built movie, TV, and people metadata catalog with a free REST API used by streaming apps, recommendation engines, second-screen experiences, fan sites, and AI/ML workflows. · GitHub](https://github.com/api-evangelist/tmdb)
29. [API Terms of Use — The Movie Database (TMDB)](https://www.themoviedb.org/api-terms-of-use)
30. [TV Series Watch Providers](https://developer.themoviedb.org/reference/tv-series-watch-providers)
31. [Rate Limiting](https://docs.anilist.co/guide/rate-limiting)
32. [v0.73.0: Missing details filled in; sources rated Adult only, AniList's pace and engine passwords by AngeloSha · Pull Request #273 · AngeloSha/uchiyomi · GitHub](https://github.com/AngeloSha/uchiyomi/pull/273)
33. [IGDB API docs: Getting Started](https://api-docs.igdb.com/)
34. [Terms of Service • RAWG](https://rawg.io/tos_api)
35. [RAWG Video Games Database API API](https://apis.guru/apis/rawg.io)
36. [Spotify now requires premium accounts for developer mode API access - Neowin](https://www.neowin.net/news/spotify-now-requires-premium-accounts-for-developer-mode-api-access/)
37. [February 2026 Web API Dev Mode Changes - Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
38. [PV1: Deezer preview URL for a library track by zvirb · Pull Request #462 · zvirb/songnodes · GitHub](https://github.com/zvirb/songnodes/pull/462)
39. [Use Preview API for Trivia music game](https://en.deezercommunity.com/deezer-for-creators-55/use-preview-api-for-trivia-music-game-83063)
40. [Deezer API — Status & Free Tier](https://freeapi.watch/deezer/)
41. [Pricing & Fees](https://supabase.com/pricing)
42. [Supabase free tier limits: what the Free plan includes](https://park23.io/insights/supabase-free-tier-limits/)
43. <https://neon.com/faqs/free-plan-limits-and-quotas>
44. [Platforms with a real free tier for developers in 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
45. [Render free tier 2026 - Free Web, DB, KV Plans](https://freetier.co/directory/products/render)
46. [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)
47. [Vercel Free Tier: Hobby Plan Limits (2026)](https://costbench.com/software/developer-tools/vercel/free-plan/)
48. [Is Vercel Free? Yes on Hobby, No for Commercial](https://zplatform.ai/guides/is-vercel-free/)
49. [Gemini Embedding Free Tier Documentation? - Gemini API - Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-embedding-free-tier-documentation/112553)
50. [Gemini API Free Tier in 2026: Limits, Models, and When You Get Billed](https://apidog.com/blog/gemini-api-free-tier/)
51. [developersdigest.tech](https://www.developersdigest.tech/rate-limits/google)
52. [Claude Code Pricing 2026: Complete Plans & Cost Guide](https://www.finout.io/blog/claude-code-pricing-2026)
53. [atomr-agents-coding-cli-vendor-antigravity 0.21.0](https://docs.rs/crate/atomr-agents-coding-cli-vendor-antigravity/latest/source/README.md)
54. [Gemini CLI vs. Antigravity: What works, not the spec sheet - The New Stack](https://thenewstack.io/gemini-cli-antigravity-replacement/)
55. [Gemini CLI Review: Google's AI Coding Agent (2026)](https://codegen.com/ai-tools/gemini-cli/)
56. [Google Antigravity](https://en.wikipedia.org/wiki/Google_Antigravity)
57. [Jules Review (2026): Google Autonomous AI Coding Agent](https://theaiagentindex.com/agents/jules)
58. [Google Jules Is Now Available to Everyone: Limits, Plans, and Features](https://rottenwifi.com/googles-jules-ai-coding-assistant-is-now-available-to-everyone-heres-what-that-means/)
59. [Jules, Google’s asynchronous AI coding agent, is out of public beta](https://blog.google/innovation-and-ai/models-and-research/google-labs/jules-now-available/)
60. [Show our Continue Watching on the Google TV / Chromecast home screen · Issue #165 · brunoccst/iptv-player · GitHub](https://github.com/brunoccst/iptv-player/issues/165)
61. [Designing for Android TV. Android TV is an exciting platform…](https://medium.com/exploring-android/designing-for-android-tv-9fecd5cd0c8c)
62. [Google TV’s cleaner look is expanding beyond early testers](https://www.androidpolice.com/google-tv-homescreen-redesign-is-official/)
63. [Prime Video rolls out an improved streaming experience—here's what’s new](https://www.aboutamazon.com/news/entertainment/prime-video-updated-steaming-experience)
64. [Here’s Everything You Need To Know About The New Amazon Prime Video Update](https://www.channelnews.com.au/heres-everything-you-need-to-know-about-the-new-amazon-prime-video-update/)
65. [Why Every AI-Built Website Looks the Same (Blame Tailwind's Indigo-500) - DEV Community](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)
66. [Why Do AI-Generated Websites All Look the Same?](https://www.joshuasnoddy.com/blog/why-ai-websites-look-the-same/)
67. [20 Signs a Website Was Made by AI · SCALR](https://scalr.sg/blog/20-signs-a-website-was-made-by-ai/)
68. [Why Your AI Keeps Building the Same Purple Gradient Website](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)
69. [Gate where-to-watch work on TMDB/JustWatch licensing clarity · Issue #32 · Rayat23/movie\_tracker · GitHub](https://github.com/Rayat23/movie_tracker/issues/32)
70. [Render Free Tier 2026: Limits, Pricing & What Changed](https://agentdeals.dev/vendor/render)
71. [Which managed Postgres databases have a free tier generous enough to run a real app without paying anything until you have users? - Neon FAQs](https://neon.com/faqs/managed-postgres-databases-free-tier)
72. [Short answer](https://neon.com/faqs/postgres-databases-vector-embeddings-scale-to-zero)
73. [Antigravity CLI](https://learn.arm.com/install-guides/antigravity/)
