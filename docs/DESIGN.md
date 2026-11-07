# Understory: Rhorverse design system

The spec comes from the build plan, section 7. Values live in `packages/tokens/tokens.json`; nothing else defines a colour, font, radius, shadow or easing. Open `/dev/tokens` (dev only) to see every colour with its live contrast ratio.

## Principles
1. **Content is the colour.** Chrome is near-black green and posters bring the colour. Green appears as signal: focus, selection, primary action.
2. **One focus, always visible**, by mouse, keyboard or remote.
3. **Editorial restraint.** Apple-style whitespace on detail pages, Google-TV density on browse pages. Never both at once.
4. **Specific words.** Every label says something true about this title or this user.
5. **Motion explains, never decorates.**

## Colour
| Semantic token | Dark | Light | Use |
|---|---|---|---|
| `surface` | `#0B110E` | `#F6F8F5` | Page background |
| `surface-raised` | `#111A15` | `#FFFFFF` | Cards |
| `surface-overlay` | `#17231C` | `#EDF2EC` | Menus, dialogs, player, secondary buttons |
| `surface-hover` | `#1E2D24` | `#E3EAE4` | Hover and selected rows |
| `line` | `#2A3B31` | `#CBD6CD` | Hairlines |
| `ink` / `ink-muted` / `ink-faint` | `#ECF3EE` / `#A9B8AE` / `#7E8F84` | `#0E1A13` / `#3E4F44` / `#566A5D` | Text, secondary, meta |
| `accent` + `accent-ink` | `#1FAE6E` + `#06110B` | `#146C45` + `#FFFFFF` | Primary button. White on the dark-theme emerald fails contrast (2.9:1). |
| `link`, `highlight` | `#7BE0B0` | `#146C45` | Links, active icons, explanations |
| `chip-selected` + `chip-selected-ink` | `#1B4D33` + `#FFFFFF` | same | Selected chip, active tab, pressed button |
| `brand` | `#0F2A1D` | `#DCE7DE` | Fallback behind missing art |
| `focus` | `#3DFF9A` | `#1B4D33` | Focus ring only (neon green vanishes on the light background) |
| `rank` | `#E8B04B` | `#8A5A00` | Rank numerals, "New" |
| `danger` | `#F0716A` | `#B3261E` | Errors |

`pnpm --filter @rhorverse/tokens check` fails if a text pair drops below 4.5:1 or a UI pair below 3:1, in either theme. Ramps `emerald` and `amber` share names with Tailwind defaults on purpose (they're the plan's names); reach them through semantic tokens, because ESLint rejects them in `className`.

## Type
- **Display:** Bricolage Grotesque. **UI/body:** Instrument Sans. **Meta/numerals:** IBM Plex Mono (years, runtime, track length).
- Sizes: `text-display-xl` (hero), `text-display-l` (page and detail titles), `text-title` (rail headings), `text-body`, `text-meta`.

## Shape, elevation, gradients
- Radii: `rounded-tile` 6, `rounded-card` 10, `rounded-sheet` 16, `rounded-pill`. Tailwind's default radii are removed.
- Elevation is surface steps. The only shadow is `shadow-focus`, on the focused tile.
- The only gradients are `bg-scrim` (over photos) and `bg-canopy-glow` (behind missing art). The only blur is the top bar, and only after 24 px of scroll.

## Motion
- `duration-instant` 90, `quick` 160, `base` 240, `slow` 420, `cinematic` 640 (hero crossfade only). Easings `ease-standard`, `ease-enter`, `ease-exit`. The hero rotates every 8 s.
- `prefers-reduced-motion` collapses transitions.

## Focus
A focused tile scales 1.06 (1.10 in TV mode) over 160 ms with `ease-enter`, gets a 2 px `focus` ring at 3 px offset and `shadow-focus`; the other tiles in the rail dim to 85%, and the rail scrolls so the focused tile sits 2nd from the left. Everything else gets the same ring via `:focus-visible`.

## Tiles
Poster 2:3 · landscape 16:9 · square 1:1 · capsule 460:215. Titles below the art, never on top of it. A tile falls back across image shapes rather than showing a blank.

## Page frame and heroes (design canvas, 2026-11-06)
- **Gutters.** Pages have no max width: `--gutter` is 20 px on a phone and 40 px from `md` up. On TV it is also offset by the overscan (`--safe-x`, `--safe-y`), set on `html[data-tv]`.
- **Hero.** A page whose first block is `[data-hero]` (Home, the medium tabs, title pages) runs full-bleed up under the nav: negative margin of `--nav-h` (TopNav keeps it current with a ResizeObserver), `main` loses its top padding (`main:has(> [data-hero]:first-child)`) and the nav is clear until the page scrolls 24 px (`body:has([data-hero]) [data-topnav][data-scrolled="false"]`). Tab heroes are `compact` (page-title size, shorter) and keep the tab name as a screen-reader-only `<h1>`.
- **Scrim.** `bg-scrim` is two layers: bottom to top, and left to right. It is the one gradient over photos.
- **Hero dots.** The selected dot is 48 px wide and fills over 8 s (`.hero-fill`, still when motion is reduced). Hovering or focusing the hero stops the rotation.
- **TopNav end.** Theme toggle, Search, then Sign in (a small secondary pill) or the avatar menu (Your taste profile, Imports, Account, Sign out). "Your taste profile", "Import history" and "Privacy notice" are also in the footer, for guests.

## Components added or changed for the canvas
- `components/controls/`: Button (primary, secondary, ghost; `aria-pressed` reads as selected), Chip and ChipLink (filters), Field, PasswordField, Checkbox, Toast. This folder is not called `ui/` because ESLint bans that path (no shadcn).
- Tiles are 168 (poster), 184 (square), 296 (landscape) and 320 px (capsule) wide, in rem so TV mode scales them. Top 10 numerals are 8.5rem mono, outlined in `rank`, filled while the tile is hovered or focused.
- Detail pages: `Section` (title + body), `WhyHere` and `TagCloud` (a filled tag matches your taste), `Availability` (Stream / Rent / Buy rows with provider logos), `CastRow` (initial avatars), `UpNext` (a column beside the page, below it when narrow).
- Music: `TrackRow` shows the number, a play arrow on hover or focus, and a live dot while it plays. `MiniPlayer` shows time and progress; `useIsPlaying(url)` tells a row whether it is the one playing.
- States: `EmptyState`, `RailSkeleton` (tile-shaped blanks under the real heading), the error page (Retry, Back to Home, error digest), the 404 (failed address, search box), and `ToastHost` (`announce()` from `lib/toast.ts`).

## Canvas content with no data behind it (not built)
"Continue where you left off", "Top 10 this week", "On JioHotstar", Add to list, 1–5 star ratings, game Time to beat / Player ratings / Screenshots, Fans also like, Open in Apple Music, hover play buttons on album tiles, the Rails/Grid toggle on tabs, certificates like "UA 16+", seasons and episodes, and Undo on the Seen it toast (there is no delete-event endpoint). Build them when the data and endpoints exist.

## Layout decisions the plan leaves open
- Pressed buttons use `chip-selected`, the same as selected chips. Hover moves one surface step up.
- The detail header holds the title, meta chips and actions. Overview is its own section below, so text never sits on the bright part of a photo.
- Albums have no backdrop, so their header shows the square art on `bg-canopy-glow`.

## Screens
- **Home rails, in order:** Saved for later, For you · Movies, For you · Anime, More like X (mixed tile shapes), Top 10 available in India, Albums for your taste, Games like X, then Popular per medium. Rail titles must be true: "Continue" and "this week" aren't used because we have no watch progress or weekly chart.
- **Hero line:** always data-derived, "Because you liked X" or "#2 most popular in TV".
- **Title page order:** overview, why it's here for you, where to watch, tags, cast, across media; up-next column at ≥1280 px.
- **Tabs:** medium hero plus link-based chips (languages, formats, genres, platforms).
- **Search:** grouped by medium with See all; filter chips need live data, so snapshot mode hides them.
- **Profile:** ranked bars, never a radar.
- **Tile actions:** hover or focus a tile for Seen it / Not interested (always visible on touch); `S` and `X` do the same from the keyboard. Both stop the work being recommended; the tile fades out over 160 ms and ranks renumber. Hidden in snapshot mode.
- **Keyboard:** the first Tab stop is a skip-to-content link.
- **TV mode** (`?tv=1`, Profile toggle or a TV user agent): 1.4x type, 5% overscan, ↑/↓/←/→ between tiles and rails.

## Banned (the plan's "looks AI-made" list)
Purple/indigo gradients, Inter/Geist/system fonts, `rounded-2xl` with `shadow-md`, three-equal-card grids, emoji and sparkles, "AI" in UI copy, glass cards, a badge above the headline, fade-in on every section, marketing filler.

## Attribution
Render `<Credit source=…>` wherever provider data appears. Provider logos are never more prominent than ours.

## Rhian's calls
*(Yours to write: the plan asks for five sentences on your hero layout, tile shape and accent usage. It's also a good interview answer about product judgement.)*
