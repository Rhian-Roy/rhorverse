"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ChipBar, type Chip } from "@/components/chips/ChipBar";
import { Tile } from "@/components/rail/Tile";
import { api } from "@/lib/api";
import type { MediaType, Work } from "@/lib/types";

const MEDIA_CHIPS: Chip<MediaType>[] = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "anime", label: "Anime" },
  { value: "music", label: "Music" },
  { value: "game", label: "Games" },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [media, setMedia] = useState<MediaType | null>(null);
  const [items, setItems] = useState<Work[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void api.search(q, media ?? undefined).then((r) => !cancelled && setItems(r.items));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, media]);

  return (
    <>
      <label className="flex items-center gap-3 rounded-pill border border-line bg-surface-raised px-5 py-3">
        <MagnifyingGlass className="text-ink-muted" />
        <span className="sr-only">Search</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search movies, shows, anime, music, games…"
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      <ChipBar chips={MEDIA_CHIPS} value={media} onChange={setMedia} label="Media type" />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-6">
        {items.map((w) => (
          <li key={w.id}>
            <Tile work={w} />
          </li>
        ))}
      </ul>
    </>
  );
}
