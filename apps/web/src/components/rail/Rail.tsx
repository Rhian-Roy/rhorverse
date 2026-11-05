"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useId, type KeyboardEvent } from "react";
import { BecauseYouLiked } from "@/components/detail/BecauseYouLiked";
import type { Rail as RailData } from "@/lib/types";
import { Tile } from "./Tile";
import { Top10Tile } from "./Top10Tile";

/**
 * Horizontal rail. Embla handles drag/scroll-snap; ←/→ move focus between tiles
 * (roving focus) and Embla scrolls the focused tile into view.
 */
export function Rail({ rail }: { rail: RailData }) {
  const headingId = useId();
  const [viewportRef, embla] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tiles = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tile]"));
      const current = tiles.indexOf(document.activeElement as HTMLElement);
      if (current === -1) return;
      const next = Math.min(tiles.length - 1, Math.max(0, current + (e.key === "ArrowRight" ? 1 : -1)));
      e.preventDefault();
      tiles[next]?.focus();
      embla?.scrollTo(Math.max(0, next - 1));
    },
    [embla],
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={headingId} className="font-display text-title text-ink">
            {rail.title}
          </h2>
          {rail.explanation ? <BecauseYouLiked explanation={rail.explanation} compact /> : null}
        </div>
        <div className="hidden gap-1 md:flex">
          <button
            type="button"
            aria-label={`Scroll ${rail.title} left`}
            onClick={() => embla?.scrollPrev()}
            className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface-overlay hover:text-ink"
          >
            <CaretLeft />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${rail.title} right`}
            onClick={() => embla?.scrollNext()}
            className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface-overlay hover:text-ink"
          >
            <CaretRight />
          </button>
        </div>
      </div>
      <div ref={viewportRef} className="-mx-3 -my-6 overflow-hidden px-3 py-6" onKeyDown={onKeyDown}>
        <ul data-rail className="flex snap-x items-end gap-4">
          {rail.items.map((work, i) => (
            <li key={work.id}>
              {rail.ranked ? <Top10Tile work={work} rank={i + 1} /> : <Tile work={work} variant={rail.variant} />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
