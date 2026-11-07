import type { Work } from "@/lib/types";
import { Tile } from "./Tile";

/**
 * Ranked tile: a large outlined numeral tucked behind the poster. The numeral is amber (the rank
 * colour), outlined at rest and filled while the tile is hovered or focused.
 */
export function Top10Tile({ work, rank, onDone }: { work: Work; rank: number; onDone?: (id: string) => void }) {
  return (
    <div className="group/top10 relative flex shrink-0 snap-start items-end">
      <span
        aria-hidden
        className="mr-[-22px] mb-12 font-mono text-[8.5rem] leading-[0.78] font-medium tracking-[-0.08em] text-transparent transition-colors duration-quick select-none [-webkit-text-stroke:2px_var(--color-rank)] group-focus-within/top10:text-rank group-hover/top10:text-rank"
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
