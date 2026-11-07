"use client";

import { MusicNote, Pause, Play, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Track } from "@/lib/types";

export const PLAY_EVENT = "rhorverse:play";

/** Fire from anywhere to start a 30-second preview in the persistent player. */
export function playPreview(track: Track) {
  window.dispatchEvent(new CustomEvent<Track>(PLAY_EVENT, { detail: track }));
}

// What is playing right now, so a track row can mark itself. Kept outside React: the player and the
// rows are far apart in the tree.
interface Now {
  url: string | null;
  playing: boolean;
}
let now: Now = { url: null, playing: false };
const listeners = new Set<() => void>();
function setNow(next: Now) {
  if (next.url === now.url && next.playing === now.playing) return;
  now = next;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** True while this preview URL is the one playing. */
export function useIsPlaying(url: string | null | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!url && now.url === url && now.playing,
    () => false,
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const length = 30; // previews are 30 s clips

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

  useEffect(() => {
    setNow({ url: track?.preview_url ?? null, playing });
  }, [track, playing]);

  return (
    <div
      role="region"
      aria-label="Preview player"
      hidden={!track}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto grid max-w-160 grid-cols-[2.75rem_1fr_auto_auto] items-center gap-3.5 overflow-hidden rounded-card border border-line bg-surface-overlay p-2.5 pb-3 sm:grid-cols-[2.75rem_1fr_auto_auto_auto]"
    >
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
      />
      <span aria-hidden className="grid size-11 place-items-center rounded-tile bg-brand text-ink-muted">
        <MusicNote />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] text-ink">{track?.title}</p>
        <p className="truncate text-meta text-ink-muted">
          {track?.artist} · <span className="font-mono">30-sec preview</span>
        </p>
      </div>
      <span className="hidden font-mono text-meta text-ink-muted tabular-nums sm:block">
        {clock(position)} / {clock(length)}
      </span>
      <button
        type="button"
        aria-label={playing ? "Pause preview" : "Play preview"}
        onClick={() => (playing ? audioRef.current?.pause() : void audioRef.current?.play())}
        className="grid size-10 place-items-center rounded-pill bg-accent text-accent-ink transition-colors duration-quick hover:bg-accent-strong"
      >
        {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
      </button>
      <button
        type="button"
        aria-label="Close player"
        onClick={() => {
          audioRef.current?.pause();
          setTrack(null);
        }}
        className="grid size-10 place-items-center rounded-pill text-ink-muted hover:bg-surface-hover hover:text-ink"
      >
        <X aria-hidden />
      </button>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-hover">
        <span className="block h-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${Math.min(100, (position / length) * 100)}%` }} />
      </span>
    </div>
  );
}
