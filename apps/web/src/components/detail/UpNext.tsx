import Image from "next/image";
import Link from "next/link";
import { hrefFor } from "@/components/rail/Tile";
import type { Work } from "@/lib/types";

/** Up-next column beside a title, on wide screens only. */
export function UpNext({ items }: { items: Work[] }) {
  if (items.length === 0) return null;
  return (
    <aside aria-labelledby="up-next" className="hidden flex-col gap-3 xl:flex">
      <h2 id="up-next" className="font-display text-title text-ink">
        Up next
      </h2>
      <ul className="flex flex-col gap-1">
        {items.slice(0, 8).map((w) => {
          const art = w.images.poster ?? w.images.square ?? w.images.capsule ?? w.images.backdrop;
          return (
            <li key={w.id}>
              <Link
                href={hrefFor(w)}
                className="flex items-center gap-3 rounded-card p-2 transition-colors duration-quick hover:bg-surface-hover"
              >
                <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-tile bg-surface-overlay">
                  {art ? <Image src={art} alt="" fill sizes="2.75rem" className="object-cover" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-sm text-ink">{w.title}</span>
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
