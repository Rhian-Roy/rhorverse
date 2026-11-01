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
- Ramp names must not collide with Tailwind's defaults (`indigo`, `violet`, `purple`, `slate`, `gray`…), so a grep for them stays empty.
- Prefer semantic names (`accent`, `ink-muted`) in components. Use raw ramps only for one-offs like gradients.
