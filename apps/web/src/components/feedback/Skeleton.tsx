import { ASPECT } from "@/components/rail/Tile";
import type { TileVariant } from "@/lib/types";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-tile bg-surface-overlay ${className}`} />;
}

/** A rail that is still loading: its heading (when known) and tile-shaped blanks with two lines under each. */
export function RailSkeleton({
  variant = "poster",
  count = 6,
  title,
}: {
  variant?: Exclude<TileVariant, "auto">;
  count?: number;
  title?: string;
}) {
  return (
    <div role="status" aria-label={title ? `Loading ${title}` : "Loading"} className="flex flex-col gap-2">
      {title ? (
        <h2 className="font-display text-title text-ink">{title}</h2>
      ) : (
        <Skeleton className="h-6 w-48" />
      )}
      <div className="flex gap-4 overflow-hidden py-6">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="shrink-0">
            <Skeleton className={ASPECT[variant]} />
            <Skeleton className="mt-2.5 h-3 w-[70%]" />
            <Skeleton className="mt-1.5 h-3 w-[30%]" />
          </div>
        ))}
      </div>
    </div>
  );
}
