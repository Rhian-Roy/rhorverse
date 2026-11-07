# Design rules (Understory) — mirror of docs/DESIGN.md core rules

1. Colours, type, spacing, radii and motion come only from `packages/tokens/tokens.json`. Never use Tailwind default colours or raw hex.
2. Dark-first. Surfaces layer `surface` → `surface-raised` → `surface-overlay`. Text uses `ink`, `ink-muted`, `ink-faint`.
3. One accent per view (`accent`). `rank` is only for ranking numerals and "New". Follow docs/DESIGN.md: green palette, Bricolage Grotesque + Instrument Sans + IBM Plex Mono.
4. Icons: Phosphor, `regular` weight only, 20px default.
5. Motion: use `motion/react` with token durations. Respect `prefers-reduced-motion`.
6. Everything focusable must show a visible `focus-visible` ring (`ring-focus`) and work with keyboard and TV remote (norigin).
7. Tiles keep their aspect per variant: poster 2:3, landscape 16:9, square 1:1, capsule 460:215.
8. Credit data sources inline with `<Credit>` wherever their data appears.
9. Page frame: use `--gutter` for horizontal page padding, never a fixed `px-*` on `main` content. A hero is the first child of `main`, carries `data-hero`, and slides under the nav with `-mt-[calc(var(--nav-h)+var(--safe-y))]`.
10. Shared controls live in `components/controls/` (Button, Chip, Field, Checkbox, Toast). Do not create `components/ui/` (ESLint bans it).
11. Do not build canvas content that has no data (see docs/DESIGN.md › "Canvas content with no data"): no mock rails, ratings or counts.
