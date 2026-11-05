"use client";

import { Pause, Play, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";

export const PLAY_EVENT = "rhorverse:play";

/** Fire from anywhere to start a 30-second preview in the persistent player. */
export function playPreview(track: Track) {
  window.dispatchEvent(new CustomEvent<Track>(PLAY_EVENT, { detail: track }));
}

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onPlay = (e: Event) => setTrack((e as CustomEvent<Track>).detail);
    window.addEventListener(PLAY_EVENT, onPlay);
    return () => window.removeEventListener(PLAY_EVENT, onPlay);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.preview_url) return;
    audio.src = track.preview_url;
    void audio.play().catch(() => setPlaying(false));
  }, [track]);

  return (
    <div
      role="region"
      aria-label="Preview player"
      hidden={!track}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-card border border-line bg-surface-overlay p-3"
    >
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        aria-label={playing ? "Pause preview" : "Play preview"}
        onClick={() => (playing ? audioRef.current?.pause() : void audioRef.current?.play())}
        className="grid size-10 place-items-center rounded-pill bg-accent text-accent-ink"
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{track?.title}</p>
        <p className="truncate text-xs text-ink-muted">{track?.artist} · 30-s preview</p>
      </div>
      <button
        type="button"
        aria-label="Close player"
        onClick={() => {
          audioRef.current?.pause();
          setTrack(null);
        }}
        className="grid size-8 place-items-center rounded-pill text-ink-muted hover:text-ink"
      >
        <X />
      </button>
    </div>
  );
}
