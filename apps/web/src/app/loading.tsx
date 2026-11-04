import { RailSkeleton } from "@/components/feedback/Skeleton";

/** Shown while a page's server data loads; on the free tier the API may need a moment to wake. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <p role="status" className="text-sm text-ink-muted">
        Waking the recommender…
      </p>
      <RailSkeleton />
      <RailSkeleton variant="square" />
    </div>
  );
}
