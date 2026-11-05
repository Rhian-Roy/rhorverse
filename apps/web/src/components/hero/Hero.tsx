"use client";

import { duration, ease } from "@rhorverse/tokens";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SeenItButton } from "@/components/detail/SeenItButton";
import { hrefFor } from "@/components/rail/Tile";
import { api } from "@/lib/api";
import type { MediaType, Work } from "@/lib/types";

const MEDIA_LABEL: Record<MediaType, string> = { movie: "Film", tv: "TV", anime: "Anime", music: "Music", game: "Game" };

/** Featured rotator: cross-fades backdrops through `items`, pausing on hover/focus. */
export function Hero({ items, titleAs: Title = "h1" }: { items: Work[]; titleAs?: "h1" | "h2" }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), duration.rotate);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const work = items[index];
  if (!work) return null;

  const chips = [work.year, MEDIA_LABEL[work.media], work.tags[0]].filter(Boolean);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative isolate flex min-h-[56svh] flex-col justify-end overflow-hidden rounded-sheet bg-brand md:min-h-[70svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={work.id}
          aria-hidden
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.cinematic / 1000, ease: [...ease.standard] }}
        >
          {work.images.backdrop ? (
            <Image src={work.images.backdrop} alt="" fill priority={index === 0} sizes="100vw" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-scrim" />
        </motion.div>
      </AnimatePresence>
      <div className="flex flex-col gap-4 p-6 pb-10 md:p-10 md:pb-12">
        <Title className="max-w-4xl font-display text-display-xl text-ink">{work.title}</Title>
        <ul className="flex flex-wrap gap-2" aria-label="Details">
          {chips.map((chip) => (
            <li
              key={String(chip)}
              className="rounded-pill border border-line bg-surface/70 px-3 py-1 font-mono text-meta text-ink"
            >
              {chip}
            </li>
          ))}
        </ul>
        {work.why ? <p className="max-w-2xl text-lg text-ink">{work.why}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Link
            href={hrefFor(work)}
            className="rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition-colors duration-quick hover:bg-accent-strong"
          >
            Details
          </Link>
          {/* Seen it needs the API; the snapshot build has nowhere to send it. */}
          {api.mode === "live" ? <SeenItButton key={work.id} workId={work.id} /> : null}
        </div>
      </div>
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
