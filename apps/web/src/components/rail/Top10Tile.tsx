import type { Work } from "@/lib/types";
import { Tile } from "./Tile";

/** Ranked tile: oversized outline numeral behind a poster. */
export function Top10Tile({ work, rank, onDone }: { work: Work; rank: number; onDone?: (id: string) => void }) {
  return (
    <div className="relative flex shrink-0 snap-start items-end">
      <span
        aria-hidden
        className="-mr-6 font-display text-[7rem] leading-none font-bold text-transparent select-none [-webkit-text-stroke:2px_var(--color-rank)]"
      >
        {rank}
      </span>
      <div className="relative">
        <span className="sr-only">Number {rank}: </span>
        <Tile work={work} variant="poster" onDone={onDone} />
      </div>
    </div>
  );
}
