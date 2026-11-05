import Link from "next/link";
import type { Explanation } from "@/lib/types";

/** "Why it's here for you": the nearest thing you liked and the tags they share. */
export function WhyHere({ explanation }: { explanation: Explanation }) {
  return (
    <section aria-labelledby="why-here" className="flex flex-col gap-3">
      <h2 id="why-here" className="font-display text-title text-ink">
        Why it&apos;s here for you
      </h2>
      <p className="text-ink-muted">{explanation.reason}</p>
      {explanation.shared_tags?.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Shared tags">
          {explanation.shared_tags.map((tag) => (
            <li key={tag} className="rounded-pill bg-chip-selected px-3 py-1 text-xs text-chip-selected-ink">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-ink-faint">
        Based on{" "}
        <Link href={`/title/${encodeURIComponent(explanation.because_id)}`} className="text-link hover:underline">
          {explanation.because_title}
        </Link>
      </p>
    </section>
  );
}
