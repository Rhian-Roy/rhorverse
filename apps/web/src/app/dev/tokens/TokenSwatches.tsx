"use client";

import { color, colorLight } from "@rhorverse/tokens";
import { useTheme } from "@/lib/use-theme";

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TYPE = [
  ["font-display text-display-xl", "display-xl"],
  ["font-display text-display-l", "display-l"],
  ["font-display text-title", "title"],
  ["text-body", "body"],
  ["font-mono text-meta", "meta · 2016 · 148 min"],
] as const;

export function TokenSwatches() {
  const theme = useTheme();
  const tokens: Record<string, string> = theme === "light" ? colorLight : color;
  const bg = tokens.surface ?? "#000000";
  return (
    <>
      <h1 className="font-display text-display-l text-ink">Understory tokens ({theme})</h1>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Object.entries(tokens).map(([name, hex]) => (
          <li key={name} className="flex flex-col gap-2 rounded-card border border-line p-3">
            <div className="h-16 rounded-tile border border-line" style={{ backgroundColor: hex }} />
            <p className="text-sm text-ink">{name}</p>
            <p className="font-mono text-meta text-ink-muted">
              {hex} · {contrast(hex, bg).toFixed(1)}:1
            </p>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3">
        {TYPE.map(([cls, label]) => (
          <p key={label} className={`${cls} text-ink`}>
            {label}
          </p>
        ))}
      </section>
    </>
  );
}
