import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import type { TileVariant, Work } from "@/lib/types";
import { TileActions } from "./TileActions";

type Shape = Exclude<TileVariant, "auto">;

const MEDIA_SHAPE: Record<Work["media"], Shape> = {
  movie: "poster",
  tv: "poster",
  anime: "poster",
  music: "square",
  game: "capsule",
};

/** Rendered width in CSS px, so the browser asks for the right image rather than a viewport-sized one. */
const WIDTH_PX: Record<Shape, number> = { poster: 160, landscape: 288, square: 176, capsule: 320 };

export const ASPECT: Record<Shape, string> = {
  poster: "aspect-[2/3] w-40",
  landscape: "aspect-video w-72",
  square: "aspect-square w-44",
  capsule: "aspect-[460/215] w-80",
};

export function hrefFor(work: Pick<Work, "id" | "media">): string {
  const id = encodeURIComponent(work.id); // ids like "tmdb:movie/603" contain a slash
  switch (work.media) {
    case "music":
      return `/album/${id}`;
    case "game":
      return `/game/${id}`;
    default:
      return `/title/${id}`;
  }
}

function imageFor(work: Work, variant: Shape): string | null | undefined {
  const i = work.images;
  // Fall back across shapes (games only have landscape art); object-cover crops the centre.
  if (variant === "landscape") return i.backdrop ?? i.capsule ?? i.poster;
  if (variant === "square") return i.square ?? i.poster;
  if (variant === "capsule") return i.capsule ?? i.backdrop;
  return i.poster ?? i.capsule ?? i.backdrop;
}

export function Tile({
  work,
  variant = "poster",
  onDone,
}: {
  work: Work;
  variant?: TileVariant;
  /** Called after Seen it / Not interested is saved, so the list can drop the tile. */
  onDone?: (id: string) => void;
}) {
  const shape = variant === "auto" ? MEDIA_SHAPE[work.media] : variant;
  const src = imageFor(work, shape);
  return (
    <div data-tile-wrap className="group/tile relative shrink-0 snap-start">
      <Link
        href={hrefFor(work)}
        data-tile
        className="group block rounded-tile transition-opacity duration-quick outline-none"
      >
        <div
          data-tile-art
          className={`${ASPECT[shape]} relative origin-bottom overflow-hidden rounded-tile bg-surface-overlay transition-[scale,box-shadow] duration-quick ease-enter group-hover:scale-[1.03] group-focus-visible:scale-[1.06] group-focus-visible:shadow-focus group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus`}
        >
          {src ? (
            <Image src={src} alt="" fill sizes={`${WIDTH_PX[shape]}px`} className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-end p-3 font-display text-sm font-semibold text-ink-muted">
              {work.title}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-1 text-sm text-ink">{work.title}</p>
        {work.year ? <p className="font-mono text-meta text-ink-faint">{work.year}</p> : null}
      </Link>
      {/* Both actions need the API; the snapshot build has nowhere to send them. */}
      {api.mode === "live" ? <TileActions work={work} onDone={onDone} /> : null}
    </div>
  );
}
