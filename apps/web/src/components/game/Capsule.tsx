import Image from "next/image";
import type { WorkDetail } from "@/lib/types";

/** Store-style capsule header for a game (460:215). */
export function Capsule({ work }: { work: WorkDetail }) {
  const src = work.images.capsule ?? work.images.backdrop;
  return (
    <header className="grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="relative aspect-[460/215] overflow-hidden rounded-card bg-brand">
        {src ? <Image src={src} alt="" fill preload sizes="28rem" className="object-cover" /> : null}
      </div>
      <div className="flex flex-col justify-end gap-2">
        <h1 className="font-display text-display-l text-ink">{work.title}</h1>
        {work.year ? <p className="font-mono text-meta text-ink-faint">{work.year}</p> : null}
        {work.overview ? <p className="text-ink-muted">{work.overview}</p> : null}
      </div>
    </header>
  );
}
