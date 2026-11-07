"use client";

import { Play } from "@phosphor-icons/react";
import type { Track } from "@/lib/types";
import { playPreview, useIsPlaying } from "./MiniPlayer";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** One track. The number turns into a play arrow on hover or focus, and into a live dot while it plays. */
export function TrackRow({ track, index }: { track: Track; index: number }) {
  const playing = useIsPlaying(track.preview_url);
  return (
    <li className="group">
      <button
        type="button"
        disabled={!track.preview_url}
        aria-label={track.preview_url ? `Play 30-second preview of ${track.title}` : `${track.title}: no preview`}
        onClick={() => playPreview(track)}
        className="grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-4 rounded-tile px-3 py-2.5 text-left transition-colors duration-quick hover:bg-surface-hover active:bg-surface-overlay disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <span className="relative grid h-5 place-items-center text-ink-muted">
          {playing ? (
            <span aria-hidden className="live-dot size-2 rounded-pill bg-signal-400" />
          ) : (
            <>
              <span
                className={`font-mono text-sm tabular-nums transition-opacity ${track.preview_url ? "group-focus-within:opacity-0 group-hover:opacity-0" : ""}`}
              >
                {index}
              </span>
              {track.preview_url ? (
                <Play
                  aria-hidden
                  className="absolute text-ink opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                />
              ) : null}
            </>
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={`truncate text-[0.9375rem] ${playing ? "text-highlight" : "text-ink"}`}>{track.title}</span>
          <span className="truncate text-meta text-ink-muted">{track.artist}</span>
        </span>
        <span className="font-mono text-meta text-ink-muted tabular-nums">{fmt(track.duration_s)}</span>
      </button>
    </li>
  );
}
