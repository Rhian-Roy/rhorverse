"use client";

import { duration, ease } from "@rhorverse/tokens";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/controls/Button";
import { SeenItButton } from "@/components/detail/SeenItButton";
import { hrefFor } from "@/components/rail/Tile";
import { api } from "@/lib/api";
import type { MediaType, Work } from "@/lib/types";

const MEDIA_LABEL: Record<MediaType, string> = { movie: "Film", tv: "TV", anime: "Anime", music: "Music", game: "Game" };

/**
 * Featured rotator. It runs full-bleed up under the nav (the nav is clear until the page scrolls),
 * cross-fades backdrops through `items` every 8 s and pauses while hovered or focused. The selected
 * dot fills over the rotation.
 */
export function Hero({
  items,
  titleAs: Title = "h1",
  compact = false,
  label = "Featured",
}: {
  items: Work[];
  titleAs?: "h1" | "h2";
  /** Tab heroes are shorter and use the page-title size. */
  compact?: boolean;
  label?: string;
}) {
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
      data-hero
      aria-roledescription="carousel"
      aria-label={label}
      className={`relative isolate -mx-[calc(var(--gutter)+var(--safe-x))] -mt-[calc(var(--nav-h)+var(--safe-y))] flex flex-col justify-end overflow-hidden bg-brand ${compact ? "min-h-120 md:min-h-115" : "min-h-150 md:min-h-170"}`}
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
            <Image
              src={work.images.backdrop}
              alt=""
              fill
              preload={index === 0}
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-scrim" />
        </motion.div>
      </AnimatePresence>
      <div className="flex max-w-4xl flex-col gap-4 px-[calc(var(--gutter)+var(--safe-x))] pt-6 pb-16 md:pt-10 md:pb-18">
        <Title
          className={`font-display tracking-[-0.03em] text-balance text-ink ${compact ? "text-display-l" : "text-display-xl"}`}
        >
          {work.title}
        </Title>
        {work.why ? <p className="max-w-2xl text-lg leading-snug text-ink max-sm:text-base">{work.why}</p> : null}
        <ul className="flex flex-wrap gap-2" aria-label="Details">
          {chips.map((chip) => (
            <li
              key={String(chip)}
              className="rounded-pill border border-line bg-surface/70 px-3 py-1.5 font-mono text-meta leading-none text-ink"
            >
              {chip}
            </li>
          ))}
        </ul>
        <div className="mt-1 flex flex-wrap gap-2 md:gap-3">
          <Link href={hrefFor(work)} className={`${buttonClass({ size: "lg" })} max-sm:w-full`}>
            Details
          </Link>
          {/* Seen it needs the API; the snapshot build has nowhere to send it. */}
          {api.mode === "live" ? <SeenItButton key={work.id} workId={work.id} /> : null}
        </div>
      </div>
      {items.length > 1 ? (
        <div className="absolute right-[calc(var(--gutter)+var(--safe-x))] bottom-5 flex gap-2 md:bottom-8" role="tablist" aria-label={`${label} titles`}>
          {items.map((w, i) => (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1} of ${items.length}: ${w.title}`}
              onClick={() => setIndex(i)}
              className="group rounded-pill py-2"
            >
              <span className="relative block h-1 w-7 overflow-hidden rounded-pill bg-ink/30 transition-[width,background-color] duration-base ease-standard group-hover:bg-ink/50 group-aria-selected:w-12">
                {i === index ? (
                  <span
                    key={paused ? "paused" : "running"}
                    className={`absolute inset-0 bg-ink ${paused ? "" : "hero-fill"}`}
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
