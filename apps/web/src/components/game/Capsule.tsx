import Image from "next/image";
import { api } from "@/lib/api";
import type { WorkDetail } from "@/lib/types";
import { FeedbackActions } from "@/components/detail/FeedbackActions";

/** Game header: the store capsule beside the title, chips, platforms and actions. */
export function Capsule({ work }: { work: WorkDetail }) {
  const src = work.images.capsule ?? work.images.backdrop;
  const f = work.facets;
  const studio = f.developer?.join(", ");
  const chips = [
    work.year ? String(work.year) : null,
    ...(f.genres ?? []).slice(0, 2),
    f["avg playtime"]?.[0] ? `Avg ${f["avg playtime"][0]}` : null,
    f.metacritic?.[0] ? `Metacritic ${f.metacritic[0]}` : null,
  ].filter((c): c is string => !!c);
  return (
    <header className="flex flex-wrap items-end gap-x-10 gap-y-6 pt-2">
      <div className="relative aspect-[460/215] w-full max-w-190 min-w-0 flex-[1_1_40rem] overflow-hidden rounded-sheet bg-brand">
        {src ? <Image src={src} alt="" fill preload sizes="(min-width: 1280px) 760px, 100vw" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-4">
        <p className="font-mono text-meta text-ink-muted">{studio ? `Game · ${studio}` : "Game"}</p>
        <h1 className="font-display text-display-l tracking-[-0.03em] text-balance text-ink">{work.title}</h1>
        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Details">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-pill border border-line bg-surface/70 px-3 py-1.5 font-mono text-meta leading-none text-ink"
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
        {f.platforms?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-18 font-mono text-meta text-ink-faint">Platforms</span>
            {f.platforms.map((p) => (
              <span key={p} className="inline-flex h-7 items-center rounded-pill bg-surface-overlay px-3 text-meta text-ink">
                {p}
              </span>
            ))}
          </div>
        ) : null}
        {api.mode === "live" ? (
          <div className="mt-1">
            <FeedbackActions workId={work.id} seenLabels={["Played it", "Played"]} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
