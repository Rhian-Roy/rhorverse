import { BookmarkSimple, ThumbsDown, ThumbsUp } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import type { WorkDetail } from "@/lib/types";

const ACTIONS = [
  { label: "Loved it", Icon: ThumbsUp },
  { label: "Not for me", Icon: ThumbsDown },
  { label: "Save for later", Icon: BookmarkSimple },
] as const;

export function DetailHeader({ work }: { work: WorkDetail }) {
  const backdrop = work.images.backdrop ?? work.images.capsule;
  return (
    <header className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-orbit-950 via-surface-raised to-nebula-950">
      {backdrop ? (
        <Image src={backdrop} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-40" />
      ) : null}
      <div className="flex min-h-72 flex-col justify-end gap-4 p-10">
        <h1 className="font-display text-4xl font-bold text-ink">{work.title}</h1>
        <ul className="flex flex-wrap gap-2 text-xs text-ink-muted" aria-label="Details">
          {[work.media, work.year, work.source].filter(Boolean).map((m) => (
            <li key={String(m)} className="rounded-pill border border-line px-3 py-1 tracking-wide uppercase">
              {m}
            </li>
          ))}
        </ul>
        {work.overview ? <p className="max-w-2xl text-ink-muted">{work.overview}</p> : null}
        <div className="flex gap-2">
          {ACTIONS.map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-2 rounded-pill bg-surface-overlay px-4 py-2 text-sm text-ink hover:bg-line"
            >
              <Icon weight="regular" size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
