"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChipBar, type Chip } from "@/components/chips/ChipBar";
import { Tile } from "@/components/rail/Tile";
import { api } from "@/lib/api";
import type { MediaType, SearchFilters, Work } from "@/lib/types";

const MEDIA_CHIPS: Chip<MediaType>[] = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "anime", label: "Anime" },
  { value: "music", label: "Music" },
  { value: "game", label: "Games" },
];

const FILTER_CHIPS: { key: keyof SearchFilters; label: string }[] = [
  { key: "in_india", label: "Available in India" },
  { key: "free", label: "Free" },
  { key: "under_2h", label: "Under 2 h" },
];

const GROUP_SIZE = 6;

function ResultGrid({ items, onDone }: { items: Work[]; onDone: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-6">
      {items.map((w) => (
        <li key={w.id}>
          <Tile work={w} onDone={onDone} />
        </li>
      ))}
    </ul>
  );
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [media, setMedia] = useState<MediaType | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [items, setItems] = useState<Work[]>([]);
  const results = useRef<HTMLDivElement>(null);
  // Seen it / Not interested: the work leaves the results immediately.
  const dropWork = (id: string) => setItems((list) => list.filter((w) => w.id !== id));

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void api.search(q, media ?? undefined, filters).then((r) => !cancelled && setItems(r.items));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, media, filters]);

  // Keyboard-first: down from the box moves into the results.
  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowDown") return;
    const first = results.current?.querySelector<HTMLElement>("[data-tile]");
    if (first) {
      e.preventDefault();
      first.focus();
    }
  };

  const groups = MEDIA_CHIPS.map((chip) => ({
    ...chip,
    works: items.filter((w) => w.media === chip.value),
  })).filter((g) => g.works.length > 0);

  return (
    <>
      <label className="flex items-center gap-3 rounded-pill border border-line bg-surface-raised px-5 py-3">
        <MagnifyingGlass className="text-ink-muted" />
        <span className="sr-only">Search</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search movies, shows, anime, music, games…"
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <ChipBar chips={MEDIA_CHIPS} value={media} onChange={setMedia} label="Media type" />
        {/* These read availability and runtime from the API; snapshot data doesn't carry them. */}
        {api.mode === "live" ? (
          <div role="group" aria-label="Filters" className="scrollbar-none flex gap-2 overflow-x-auto">
            {FILTER_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={!!filters[key]}
                onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                className="shrink-0 rounded-pill border border-line px-4 py-1.5 text-sm text-ink-muted transition-colors duration-quick hover:text-ink aria-pressed:border-chip-selected aria-pressed:bg-chip-selected aria-pressed:text-chip-selected-ink"
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div ref={results} className="flex flex-col gap-10">
        {media ? (
          <ResultGrid items={items} onDone={dropWork} />
        ) : (
          groups.map((g) => (
            <section key={g.value} aria-label={g.label} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-title text-ink">{g.label}</h2>
                {g.works.length > GROUP_SIZE ? (
                  <button type="button" onClick={() => setMedia(g.value)} className="text-sm text-link hover:underline">
                    See all
                  </button>
                ) : null}
              </div>
              <ResultGrid items={g.works.slice(0, GROUP_SIZE)} onDone={dropWork} />
            </section>
          ))
        )}
      </div>
    </>
  );
}
