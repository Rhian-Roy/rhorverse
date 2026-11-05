import Link from "next/link";
import type { Explanation } from "@/lib/types";

/** The small "Because you liked X" line under a rail heading, from rec/explain.py templates. */
export function BecauseYouLiked({ explanation }: { explanation: Explanation }) {
  return (
    <p className="text-xs text-ink-faint">
      Because you liked{" "}
      <Link href={`/title/${encodeURIComponent(explanation.because_id)}`} className="text-link hover:underline">
        {explanation.because_title}
      </Link>
    </p>
  );
}
