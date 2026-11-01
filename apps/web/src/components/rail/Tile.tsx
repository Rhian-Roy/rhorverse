import Image from "next/image";
import Link from "next/link";
import type { TileVariant, Work } from "@/lib/types";

export const ASPECT: Record<TileVariant, string> = {
  poster: "aspect-[2/3] w-40",
  landscape: "aspect-video w-72",
  square: "aspect-square w-44",
  capsule: "aspect-[460/215] w-80",
};

export function hrefFor(work: Pick<Work, "id" | "media">): string {
  switch (work.media) {
    case "music":
      return `/album/${work.id}`;
    case "game":
      return `/game/${work.id}`;
    default:
      return `/title/${work.id}`;
  }
}

function imageFor(work: Work, variant: TileVariant): string | null | undefined {
  const i = work.images;
  if (variant === "landscape") return i.backdrop ?? i.poster;
  if (variant === "square") return i.square ?? i.poster;
  if (variant === "capsule") return i.capsule ?? i.backdrop;
  return i.poster;
}

export function Tile({ work, variant = "poster" }: { work: Work; variant?: TileVariant }) {
  const src = imageFor(work, variant);
  return (
    <Link
      href={hrefFor(work)}
      data-tile
      className="group block shrink-0 snap-start rounded-md outline-offset-4"
      aria-label={work.year ? `${work.title} (${work.year})` : work.title}
    >
      <div
        className={`${ASPECT[variant]} relative overflow-hidden rounded-md bg-linear-to-br from-night-700 to-night-900 transition-transform duration-base ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]`}
      >
        {src ? (
          <Image src={src} alt="" fill sizes="(min-width: 768px) 20vw, 40vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-end p-3 font-display text-sm font-semibold text-ink-muted">
            {work.title}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-ink">{work.title}</p>
      {work.year ? <p className="text-xs text-ink-faint">{work.year}</p> : null}
    </Link>
  );
}
