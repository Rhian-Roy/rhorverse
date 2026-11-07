import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/controls/Button";
import { api } from "@/lib/api";
import type { MediaType, WorkDetail } from "@/lib/types";
import { FeedbackActions } from "./FeedbackActions";

const EYEBROW: Record<MediaType, string> = {
  movie: "Film",
  tv: "TV series",
  anime: "Anime",
  music: "Album",
  game: "Game",
};

function metaChips(work: WorkDetail): string[] {
  const f = work.facets;
  const runtime = f.runtime_min?.[0];
  const tracks = f.tracks?.[0];
  return [
    work.year ? String(work.year) : null,
    runtime ? `${runtime} min` : null,
    tracks ? `${tracks} tracks` : null,
    f.format?.[0] ?? null,
    f.language?.[0]?.toUpperCase() ?? null,
  ].filter((chip): chip is string => chip !== null);
}

/**
 * The top of a title page: a full-bleed backdrop under the clear nav, an eyebrow, the title, meta chips
 * and actions. Without a backdrop it sits on the canopy glow, with the cover beside the title.
 */
export function DetailHeader({ work, eyebrow }: { work: WorkDetail; eyebrow?: string }) {
  const backdrop = work.images.backdrop ?? work.images.capsule;
  const art = backdrop ? null : (work.images.square ?? work.images.poster);
  const chips = metaChips(work);
  return (
    <header
      data-hero
      className={`relative isolate -mx-[calc(var(--gutter)+var(--safe-x))] -mt-[calc(var(--nav-h)+var(--safe-y))] flex min-h-130 flex-col justify-end overflow-hidden bg-brand md:min-h-160 ${backdrop ? "" : "bg-canopy-glow"}`}
    >
      {backdrop ? (
        <>
          <Image src={backdrop} alt="" fill preload fetchPriority="high" sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-scrim" />
        </>
      ) : null}
      <div className="flex max-w-275 flex-col gap-6 px-[calc(var(--gutter)+var(--safe-x))] pt-[calc(var(--nav-h)+2rem)] pb-10 md:flex-row md:items-end md:pb-14">
        {art ? (
          <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-tile md:w-56">
            <Image src={art} alt="" fill preload sizes="14rem" className="object-cover" />
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <p className="font-mono text-meta text-ink-muted">{eyebrow ?? EYEBROW[work.media]}</p>
          <h1 className="font-display text-display-xl leading-[0.95] tracking-[-0.03em] text-balance text-ink">
            {work.title}
          </h1>
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
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {work.availability.length > 0 && work.media !== "anime" ? (
              <Link href="#where-to-watch" className={buttonClass({ size: "lg" })}>
                Where to watch
              </Link>
            ) : null}
            {/* The actions need the API; the snapshot build has nowhere to send them. */}
            {api.mode === "live" ? <FeedbackActions workId={work.id} /> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
