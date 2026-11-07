import { RailSkeleton } from "@/components/feedback/Skeleton";

/**
 * Shown while a page's server data loads. On the free tier the API may need a moment to wake, so the
 * first line says so; the rails are placeholders the shape of the real ones.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p role="status" className="text-sm text-ink-muted">
        Waking the recommender…
      </p>
      <RailSkeleton variant="poster" />
      <RailSkeleton variant="square" />
    </div>
  );
}
