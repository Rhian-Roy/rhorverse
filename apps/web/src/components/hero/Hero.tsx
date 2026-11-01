"use client";

import { duration, ease } from "@rhorverse/tokens";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { hrefFor } from "@/components/rail/Tile";
import type { Work } from "@/lib/types";

/** Featured rotator: cross-fades through `items`, pausing on hover/focus. */
export function Hero({ items }: { items: Work[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), duration.hero);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const work = items[index];
  if (!work) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-orbit-900 via-surface-raised to-nebula-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={work.id}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: duration.slow / 1000, ease: [...ease.out] }}
          className="flex min-h-80 flex-col justify-end gap-3 p-10"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-accent">{work.media}</p>
          <h1 className="font-display text-4xl font-bold text-ink md:text-hero">{work.title}</h1>
          {work.overview ? <p className="max-w-xl text-ink-muted">{work.overview}</p> : null}
          <Link
            href={hrefFor(work)}
            className="mt-2 w-fit rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition-colors duration-fast hover:bg-accent-strong"
          >
            View details
          </Link>
        </motion.div>
      </AnimatePresence>
      <div className="absolute right-6 bottom-4 flex gap-2" role="tablist" aria-label="Choose featured item">
        {items.map((w, i) => (
          <button
            key={w.id}
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${w.title}`}
            onClick={() => setIndex(i)}
            className="h-1.5 w-6 rounded-pill bg-ink/25 transition-colors duration-base aria-selected:bg-ink"
          />
        ))}
      </div>
    </section>
  );
}
