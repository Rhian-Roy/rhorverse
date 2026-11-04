// Reads the committed snapshot JSON so e2e checks follow whatever `just snapshot` exported,
// instead of hard-coding titles.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HomeFeed, Work } from "../../src/lib/types";

const home = JSON.parse(readFileSync(join(__dirname, "../../public/snapshots/home.json"), "utf8")) as HomeFeed;

export const snapshotWorks: Work[] = [
  ...new Map([...home.hero, ...home.rails.flatMap((r) => r.items)].map((w) => [w.id, w])).values(),
];

/** A work of this medium whose title doesn't appear inside any other snapshot title. */
export function distinctive(media: Work["media"]): Work {
  const titles = snapshotWorks.map((w) => w.title.toLowerCase());
  const hit = snapshotWorks.find(
    (w) => w.media === media && titles.filter((t) => t.includes(w.title.toLowerCase())).length === 1,
  );
  if (!hit) throw new Error(`no distinctive ${media} work in snapshots/home.json`);
  return hit;
}
