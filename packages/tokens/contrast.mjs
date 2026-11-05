#!/usr/bin/env node
// Fails if a colour pair in tokens.json drops below its WCAG contrast target, in either theme.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { color } = JSON.parse(readFileSync(resolve(here, "tokens.json"), "utf8"));
const { semantic, semanticLight, ...ramps } = color;

const hex = (v) => v.replace(/^\{(\w+)\.(\w+)\}$/, (_, ramp, step) => ramps[ramp][step]);

function luminance(value) {
  const n = hex(value).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(n.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // body text
const UI = 3; // large text, icons, focus rings, button shapes against the page

const PAIRS = [
  ...["surface", "surface-raised", "surface-overlay"].flatMap((bg) =>
    ["ink", "ink-muted", "ink-faint", "link", "highlight", "danger"].map((fg) => [fg, bg, TEXT]),
  ),
  ["accent-ink", "accent", TEXT],
  ["chip-selected-ink", "chip-selected", TEXT],
  ["ink", "brand", TEXT],
  ["accent", "surface", UI],
  ["focus", "surface", UI],
  ["rank", "surface", UI],
];

let failed = 0;
for (const [theme, tokens] of [
  ["dark", semantic],
  ["light", semanticLight],
]) {
  for (const [fg, bg, target] of PAIRS) {
    const r = ratio(tokens[fg], tokens[bg]);
    if (r < target) {
      failed += 1;
      console.error(`${theme}: ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${target}:1`);
    }
  }
}
if (failed) process.exit(1);
console.log(`contrast ok: ${PAIRS.length} pairs in dark and light`);
