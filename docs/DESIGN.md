# Understory: Rhorverse design system

Dark-first, cosmic, calm. Content (posters, art, covers) is the colour. The UI stays quiet underneath it, hence *Understory*.

## Core rules
1. **Tokens only.** Colours, type, spacing, radii and motion come from `packages/tokens/tokens.json`. Tailwind defaults are reset (`--color-*: initial`). No raw hex in `className`. ESLint enforces both.
2. **Surfaces:** `surface` (page) → `surface-raised` (cards) → `surface-overlay` (menus, dialogs, player). Borders use `line`.
3. **Text:** `ink` (primary), `ink-muted` (secondary), `ink-faint` (meta/credits).
4. **Accent:** `accent` (orbit teal) for primary actions and focus, one per view. `highlight` (nebula) for "because you liked" and explanations. `rank` (ember) only for Top-10 numerals and live states.
5. **Type:** `font-display` (Space Grotesk) for headings and numerals, `font-sans` (Inter) for UI. Scale `text-xs … text-4xl`, plus `text-hero`.
6. **Shape:** `rounded-pill` for tabs, chips and buttons. `rounded-md` for tiles, `rounded-xl` for hero and detail headers.
7. **Icons:** Phosphor, `regular` weight only, 20px (set once in `FocusRoot`).
8. **Motion:** `motion/react` with `duration.*` / `ease.*` from `@rhorverse/tokens`. Honour `prefers-reduced-motion`. Never animate layout on TV.
9. **Focus & input:** every interactive element shows `focus-visible` (`outline-focus`). Rails use roving focus (←/→). TV mode (`?tv=1` or a TV user agent) turns on norigin spatial navigation.
10. **Tiles:** poster 2:3 · landscape 16:9 · square 1:1 · capsule 460:215. Titles below the art, never on top of it.
11. **Attribution:** render `<Credit source=…>` wherever provider data appears. Provider logos are never more prominent than ours.

## Palette (from tokens.json)
| Ramp | Use |
|---|---|
| `night` | neutrals, surfaces, ink |
| `orbit` | brand accent, focus |
| `nebula` | highlights, gradients |
| `ember` | ranks, live |
| `moss` / `flare` | success / danger |

## Voice
Friendly, brief, a little cosmic. Example 404: "This corner of the Rhorverse is uncharted."
