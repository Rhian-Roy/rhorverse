import { Check } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Explanation } from "@/lib/types";
import { Section } from "./Section";

/** "Why it's here for you": the tags this shares with your taste, then the nearest thing you liked. */
export function WhyHere({ explanation }: { explanation: Explanation }) {
  return (
    <Section id="why-here" title="Why it’s here for you">
      {explanation.shared_tags?.length ? (
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Shared tags">
          {explanation.shared_tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-chip-selected px-3 text-meta text-chip-selected-ink"
            >
              <Check aria-hidden className="size-3.5" />
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="max-w-160 text-lg leading-snug text-ink-muted">{explanation.reason}</p>
      <p className="mt-3 text-sm text-ink-faint">
        Based on{" "}
        <Link href={`/title/${encodeURIComponent(explanation.because_id)}`} className="text-link hover:underline">
          {explanation.because_title}
        </Link>
      </p>
    </Section>
  );
}
