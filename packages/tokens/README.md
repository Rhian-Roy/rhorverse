# @rhorverse/tokens

The single source of truth for Rhorverse's **Understory** design tokens: colour, type, spacing, radius and motion.

## How it works
`tokens.json` → `node build.mjs` writes:
- the `@theme { … }` block between the `@tokens:start` / `@tokens:end` markers in `apps/web/src/app/globals.css`. It starts with `--color-*: initial; --font-*: initial;`, so Tailwind's default palette and fonts are gone and only our tokens exist.
- `src/tokens.ts`: semantic colours, durations (ms) and easing arrays, for JS (e.g. `motion/react` transitions).

## Changing a token
1. Edit `tokens.json`. Semantic colours reference ramps as `"{ramp.step}"`.
2. `pnpm --filter @rhorverse/tokens build` (also run by `just setup`).
3. Use it as a utility: `--color-surface-raised` → `bg-surface-raised`, `--radius-pill` → `rounded-pill`.
4. Commit `tokens.json` **and** the regenerated outputs. CI runs `pnpm --filter @rhorverse/tokens check`.

## Rules
- Never hand-edit the generated region of `globals.css`.
- Ramp names avoid Tailwind's defaults, except `emerald` and `amber`, which are the build plan's names. Use them through semantic tokens; ESLint rejects them in `className`.
- `check` also runs `contrast.mjs`, which fails if a colour pair drops below its WCAG target in either theme.
- Light-theme values live in `color.semanticLight` and apply under `:root[data-theme="light"]`.
- Prefer semantic names (`accent`, `ink-muted`) in components. Use raw ramps only for one-offs like gradients.
