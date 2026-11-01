import Link from "next/link";
import type { Explanation } from "@/lib/types";

/** "Because you liked X" explanation block, from rec/explain.py templates. */
export function BecauseYouLiked({ explanation, compact = false }: { explanation: Explanation; compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-ink-faint">
        Because you liked{" "}
        <Link href={`/title/${explanation.because_id}`} className="text-highlight hover:underline">
          {explanation.because_title}
        </Link>
      </p>
    );
  }
  return (
    <aside className="rounded-lg border border-line bg-surface-raised p-4">
      <p className="text-sm text-ink">
        Because you liked <strong className="text-highlight">{explanation.because_title}</strong>
      </p>
      <p className="mt-1 text-sm text-ink-muted">{explanation.reason}</p>
    </aside>
  );
}
