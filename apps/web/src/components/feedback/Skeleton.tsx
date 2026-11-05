import { ASPECT } from "@/components/rail/Tile";
import type { TileVariant } from "@/lib/types";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-tile bg-surface-overlay ${className}`} />;
}

export function RailSkeleton({
  variant = "poster",
  count = 6,
}: {
  variant?: Exclude<TileVariant, "auto">;
  count?: number;
}) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className={`${ASPECT[variant]} shrink-0`} />
        ))}
      </div>
    </div>
  );
}
