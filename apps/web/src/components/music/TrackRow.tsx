"use client";

import { Play } from "@phosphor-icons/react";
import type { Track } from "@/lib/types";
import { playPreview } from "./MiniPlayer";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function TrackRow({ track, index }: { track: Track; index: number }) {
  return (
    <li className="group flex items-center gap-4 rounded-tile px-3 py-2 hover:bg-surface-hover">
      <span className="w-6 text-right text-sm text-ink-faint tabular-nums">{index}</span>
      <button
        type="button"
        disabled={!track.preview_url}
        aria-label={`Play preview of ${track.title}`}
        onClick={() => playPreview(track)}
        className="grid size-8 place-items-center rounded-pill text-ink-muted hover:text-link disabled:opacity-40"
      >
        <Play />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{track.title}</p>
        <p className="truncate text-xs text-ink-muted">{track.artist}</p>
      </div>
      <span className="font-mono text-meta text-ink-faint tabular-nums">{fmt(track.duration_s)}</span>
    </li>
  );
}
