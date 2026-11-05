import Image from "next/image";
import { api } from "@/lib/api";
import type { WorkDetail } from "@/lib/types";
import { FeedbackActions } from "./FeedbackActions";

export function DetailHeader({ work }: { work: WorkDetail }) {
  const backdrop = work.images.backdrop ?? work.images.capsule;
  return (
    <header className="relative isolate overflow-hidden rounded-sheet bg-brand">
      {backdrop ? (
        <Image src={backdrop} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-40" />
      ) : null}
      <div className="flex min-h-72 flex-col justify-end gap-4 p-10">
        <h1 className="font-display text-display-l text-ink">{work.title}</h1>
        <ul className="flex flex-wrap gap-2 text-xs text-ink-muted" aria-label="Details">
          {[work.media, work.year, work.source].filter(Boolean).map((m) => (
            <li key={String(m)} className="rounded-pill border border-line px-3 py-1 tracking-wide uppercase">
              {m}
            </li>
          ))}
        </ul>
        {work.overview ? <p className="max-w-2xl text-ink-muted">{work.overview}</p> : null}
        {/* Feedback needs the API; the snapshot build has nowhere to send it. */}
        {api.mode === "live" ? <FeedbackActions workId={work.id} /> : null}
      </div>
    </header>
  );
}
