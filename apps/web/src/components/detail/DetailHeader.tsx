import Image from "next/image";
import { api } from "@/lib/api";
import type { MediaType, WorkDetail } from "@/lib/types";
import { FeedbackActions } from "./FeedbackActions";

const MEDIA_LABEL: Record<MediaType, string> = { movie: "Film", tv: "TV", anime: "Anime", music: "Album", game: "Game" };

function metaChips(work: WorkDetail): string[] {
  const f = work.facets;
  const runtime = f.runtime_min?.[0];
  const tracks = f.tracks?.[0];
  return [
    work.year ? String(work.year) : null,
    MEDIA_LABEL[work.media],
    runtime ? `${runtime} min` : null,
    tracks ? `${tracks} tracks` : null,
    f.format?.[0] ?? null,
    f.language?.[0]?.toUpperCase() ?? null,
  ].filter((chip): chip is string => chip !== null);
}

export function DetailHeader({ work }: { work: WorkDetail }) {
  const backdrop = work.images.backdrop ?? work.images.capsule;
  const art = backdrop ? null : (work.images.square ?? work.images.poster);
  return (
    <header
      className={`relative isolate flex min-h-[50svh] flex-col justify-end overflow-hidden rounded-sheet bg-brand ${backdrop ? "" : "bg-canopy-glow"}`}
    >
      {backdrop ? (
        <>
          <Image src={backdrop} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-scrim" />
        </>
      ) : null}
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:p-10">
        {art ? (
          <div className="relative aspect-square w-40 shrink-0 overflow-hidden rounded-tile md:w-56">
            <Image src={art} alt="" fill priority sizes="14rem" className="object-cover" />
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <h1 className="max-w-4xl font-display text-display-l text-ink">{work.title}</h1>
          <ul className="flex flex-wrap gap-2" aria-label="Details">
            {metaChips(work).map((chip) => (
              <li
                key={chip}
                className="rounded-pill border border-line bg-surface/70 px-3 py-1 font-mono text-meta text-ink"
              >
                {chip}
              </li>
            ))}
          </ul>
          {/* Feedback needs the API; the snapshot build has nowhere to send it. */}
          {api.mode === "live" ? <FeedbackActions workId={work.id} /> : null}
        </div>
      </div>
    </header>
  );
}
