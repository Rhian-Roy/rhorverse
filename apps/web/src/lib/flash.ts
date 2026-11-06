import type { MergeResult } from "./types";

/** Set by /auth/callback after a guest's activity was merged; read once by <FlashToast>. */
export const FLASH_COOKIE = "rv_flash";

export function mergeFlash(m: MergeResult): string {
  return `merged.${m.events}.${m.saved}.${m.imports}`;
}

export function parseMergeFlash(raw: string | undefined): MergeResult | null {
  const m = raw?.match(/^merged\.(\d+)\.(\d+)\.(\d+)$/);
  return m ? { events: Number(m[1]), saved: Number(m[2]), imports: Number(m[3]) } : null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "14 ratings and 3 saved titles moved over." */
export function mergeSummary(m: MergeResult): string {
  const parts = [
    m.events - m.saved > 0 ? plural(m.events - m.saved, "rating") : "",
    m.saved > 0 ? plural(m.saved, "saved title") : "",
    m.imports > 0 ? plural(m.imports, "import") : "",
  ].filter(Boolean);
  if (parts.length === 0) return "";
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `${joined} moved over.`;
}
