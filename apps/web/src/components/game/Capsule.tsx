import Image from "next/image";
import type { WorkDetail } from "@/lib/types";

/** Store-style capsule header for a game (460:215). */
export function Capsule({ work }: { work: WorkDetail }) {
  const src = work.images.capsule ?? work.images.backdrop;
  return (
    <header className="grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="relative aspect-[460/215] overflow-hidden rounded-lg bg-linear-to-br from-nebula-900 to-night-900">
        {src ? <Image src={src} alt="" fill priority sizes="28rem" className="object-cover" /> : null}
      </div>
      <div className="flex flex-col justify-end gap-2">
        <h1 className="font-display text-3xl font-bold text-ink">{work.title}</h1>
        {work.year ? <p className="text-sm text-ink-muted">{work.year}</p> : null}
        {work.overview ? <p className="text-ink-muted">{work.overview}</p> : null}
      </div>
    </header>
  );
}
