import Image from "next/image";
import Link from "next/link";
import { hrefFor } from "@/components/rail/Tile";
import type { Work } from "@/lib/types";

const SHAPE: Record<Work["media"], string> = {
  movie: "aspect-[2/3] w-16",
  tv: "aspect-[2/3] w-16",
  anime: "aspect-[2/3] w-16",
  music: "aspect-square w-20",
  game: "aspect-[460/215] w-32",
};

/** Up next: neighbours of this title. Beside the page on wide screens, below it on narrow ones. */
export function UpNext({ items }: { items: Work[] }) {
  if (items.length === 0) return null;
  return (
    <aside aria-labelledby="up-next" className="min-w-0 max-w-95 flex-[1_1_18.75rem]">
      <h2 id="up-next" className="mb-4 font-display text-title text-ink">
        Up next
      </h2>
      <ul className="flex flex-col gap-1">
        {items.slice(0, 8).map((w) => {
          const art = w.images.poster ?? w.images.square ?? w.images.capsule ?? w.images.backdrop;
          return (
            <li key={w.id}>
              <Link
                href={hrefFor(w)}
                className="grid grid-cols-[auto_1fr] items-center gap-3.5 rounded-tile p-2 text-ink transition-colors duration-quick hover:bg-surface-hover"
              >
                <span aria-hidden className={`relative shrink-0 overflow-hidden rounded-tile bg-brand ${SHAPE[w.media]}`}>
                  {art ? (
                    <Image src={art} alt="" fill sizes="8rem" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-end p-2 font-display text-meta font-semibold text-ink-muted">
                      {w.title}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="line-clamp-2 text-[0.9375rem] leading-snug font-medium">{w.title}</span>
                  {w.year ? <span className="font-mono text-meta text-ink-faint">{w.year}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
