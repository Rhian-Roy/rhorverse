"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ChipBar, type Chip as ChipDef } from "@/components/chips/ChipBar";
import { Button } from "@/components/controls/Button";
import { Chip } from "@/components/controls/Chip";
import { Field } from "@/components/controls/Field";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Rail } from "@/components/rail/Rail";
import { Tile } from "@/components/rail/Tile";
import { api } from "@/lib/api";
import type { MediaType, SearchFilters, Work } from "@/lib/types";

const MEDIA_CHIPS: ChipDef<MediaType>[] = [
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

const GROUP_SIZE = 12;
const RECENT_KEY = "rhorverse:recent-searches";
const RECENT_MAX = 8;

// Recent searches live on this device only. They sit in localStorage behind a tiny store so React reads
// them without an effect, and the server and first client render agree (an empty list).
const recentListeners = new Set<() => void>();
let recentCache: { raw: string | null; list: string[] } | null = null;
const NO_RECENT: string[] = [];

function recentSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RECENT_KEY);
  } catch {
    return NO_RECENT;
  }
  if (recentCache?.raw !== raw) {
    let list: string[] = NO_RECENT;
    try {
      const parsed = JSON.parse(raw ?? "[]") as unknown;
      if (Array.isArray(parsed)) list = parsed.filter((q): q is string => typeof q === "string").slice(0, RECENT_MAX);
    } catch {
      // Unreadable: treat as empty.
    }
    recentCache = { raw, list };
  }
  return recentCache.list;
}

function saveRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode or a full quota: recent searches just don't persist.
  }
  recentListeners.forEach((l) => l());
}

function subscribeRecent(listener: () => void) {
  recentListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    recentListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [media, setMedia] = useState<MediaType | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [found, setFound] = useState<{ key: string; items: Work[] } | null>(null);
  const recent = useSyncExternalStore(subscribeRecent, recentSnapshot, () => NO_RECENT);
  const results = useRef<HTMLDivElement>(null);

  const query = q.trim();
  const key = JSON.stringify([query, media, filters]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void api.search(q, media ?? undefined, filters).then((r) => !cancelled && setFound({ key, items: r.items }));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, media, filters, key]);

  // Remember a search once its results are in, so a typo that finds nothing isn't kept.
  useEffect(() => {
    if (!found || found.key !== key || query.length < 2 || found.items.length === 0) return;
    const list = recentSnapshot();
    if (list[0]?.toLowerCase() === query.toLowerCase()) return;
    saveRecent([query, ...list.filter((r) => r.toLowerCase() !== query.toLowerCase())].slice(0, RECENT_MAX));
  }, [found, key, query]);

  const settled = found?.key === key;
  const items = settled ? found.items : (found?.items ?? []);

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

  const filtered = Object.values(filters).some(Boolean);
  const clearFilters = () => setFilters({});
  const summary = !settled
    ? ""
    : items.length === 0
      ? "No results"
      : `${items.length} ${items.length === 1 ? "result" : "results"}${query ? ` for “${query}”, best matches first` : ""}`;
  const forget = (r: string) => saveRecent(recent.filter((x) => x !== r));

  return (
    <>
      <Field
        large
        label="Search"
        type="search"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onInputKey}
        placeholder="A title, actor, director, artist or studio"
        className="max-w-220"
      />
      <div className="flex flex-wrap items-center gap-3">
        <ChipBar chips={MEDIA_CHIPS} value={media} onChange={setMedia} label="Media type" />
        {/* These read availability and runtime from the API; snapshot data doesn't carry them. */}
        {api.mode === "live" ? (
          <>
            <span aria-hidden className="h-6 w-px flex-none bg-line" />
            <div role="group" aria-label="More filters" className="scrollbar-none -m-1 flex gap-2 overflow-x-auto p-1">
              {FILTER_CHIPS.map(({ key: k, label }) => (
                <Chip key={k} selected={!!filters[k]} onClick={() => setFilters((f) => ({ ...f, [k]: !f[k] }))}>
                  {label}
                </Chip>
              ))}
            </div>
          </>
        ) : null}
      </div>
      <p aria-live="polite" className="-mt-4 min-h-5 text-sm text-ink-muted">
        {summary}
      </p>

      {query === "" && recent.length > 0 ? (
        <section aria-labelledby="recent-title" className="flex max-w-220 flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h2 id="recent-title" className="font-display text-title text-ink">
              Recent searches
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveRecent([])}
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-col">
            {recent.map((r) => (
              <div key={r} className="flex items-center gap-1 rounded-tile hover:bg-surface-hover">
                <button
                  type="button"
                  onClick={() => setQ(r)}
                  className="min-h-11 flex-1 truncate rounded-tile px-3 text-left text-[0.9375rem] text-ink"
                >
                  {r}
                </button>
                <button
                  type="button"
                  aria-label={`Remove “${r}” from recent searches`}
                  onClick={() => forget(r)}
                  className="grid size-10 shrink-0 place-items-center rounded-pill text-ink-muted hover:text-ink"
                >
                  <X aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div ref={results} className="flex flex-col gap-4">
        {settled && items.length === 0 ? (
          <EmptyState
            title={query ? `Nothing for “${query}”${filtered ? " with these filters" : ""}` : "Nothing here yet"}
            actions={
              filtered ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear all filters
                </Button>
              ) : media ? (
                <Button variant="secondary" onClick={() => setMedia(null)}>
                  Search every medium
                </Button>
              ) : null
            }
          >
            {filtered
              ? "A filter may be hiding the match. Turn the filters off to see everything that matches."
              : "Try the English or original title, a shorter spelling, or an artist or studio name."}
          </EmptyState>
        ) : media ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-4 gap-y-8">
            {items.map((w) => (
              <li key={w.id}>
                <Tile work={w} variant="auto" />
              </li>
            ))}
          </ul>
        ) : (
          groups.map((g) => (
            <Rail
              key={g.value}
              rail={{ id: `search-${g.value}`, title: g.label, variant: "auto", ranked: false, items: g.works.slice(0, GROUP_SIZE) }}
              subtitle={`${g.works.length} ${g.works.length === 1 ? "result" : "results"}`}
              action={
                g.works.length > GROUP_SIZE ? (
                  <button
                    type="button"
                    onClick={() => setMedia(g.value)}
                    aria-label={`See all ${g.label} results`}
                    className="rounded-tile px-2 py-1 text-sm font-medium text-link hover:underline"
                  >
                    See all
                  </button>
                ) : null
              }
            />
          ))
        )}
      </div>
    </>
  );
}
