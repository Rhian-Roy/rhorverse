"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useId, useRef, type KeyboardEvent } from "react";
import { BecauseYouLiked } from "@/components/detail/BecauseYouLiked";
import type { Rail as RailData } from "@/lib/types";
import { Tile } from "./Tile";
import { Top10Tile } from "./Top10Tile";

const FOCUS_TILE = "rhorverse:focus-tile";

/**
 * Horizontal rail. Embla handles drag/scroll-snap; ←/→ move focus between tiles, ↑/↓ between rails,
 * and Embla scrolls the focused tile into view.
 */
export function Rail({ rail }: { rail: RailData }) {
  const headingId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [viewportRef, embla] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });

  // The rail a focus move lands on scrolls itself, keeping the focused tile 2nd from the left.
  const scrollNear = useCallback((index: number) => embla?.scrollTo(Math.max(0, index - 1)), [embla]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onFocusTile = (e: Event) => scrollNear((e as CustomEvent<number>).detail);
    el.addEventListener(FOCUS_TILE, onFocusTile);
    return () => el.removeEventListener(FOCUS_TILE, onFocusTile);
  }, [scrollNear]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const horizontal = e.key === "ArrowRight" || e.key === "ArrowLeft";
      const vertical = e.key === "ArrowUp" || e.key === "ArrowDown";
      if (!horizontal && !vertical) return;
      const tiles = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tile]"));
      const current = tiles.indexOf(document.activeElement as HTMLElement);
      if (current === -1) return;
      e.preventDefault();
      if (horizontal) {
        const next = Math.min(tiles.length - 1, Math.max(0, current + (e.key === "ArrowRight" ? 1 : -1)));
        tiles[next]?.focus({ preventScroll: true });
        scrollNear(next);
        return;
      }
      const rails = Array.from(document.querySelectorAll<HTMLElement>("[data-rail]"));
      const here = rails.indexOf(listRef.current as HTMLElement);
      const target = rails[here + (e.key === "ArrowDown" ? 1 : -1)];
      if (!target) return;
      const others = Array.from(target.querySelectorAll<HTMLElement>("[data-tile]"));
      const index = Math.min(current, others.length - 1);
      others[index]?.focus({ preventScroll: true });
      target.dispatchEvent(new CustomEvent(FOCUS_TILE, { detail: index }));
      target.scrollIntoView({ block: "center" });
    },
    [scrollNear],
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={headingId} className="font-display text-title text-ink">
            {rail.title}
          </h2>
          {rail.explanation ? <BecauseYouLiked explanation={rail.explanation} /> : null}
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
        <ul ref={listRef} data-rail className="flex snap-x items-end gap-4">
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
