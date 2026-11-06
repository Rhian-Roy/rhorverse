"use client";

import Link from "next/link";

/** Shown when a page throws while rendering. Same voice as the 404. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex flex-col items-start gap-4 py-24">
      <p className="font-display text-display-xl text-link">Oops</p>
      <h1 className="font-display text-display-l text-ink">Something went sideways on our end.</h1>
      <p className="max-w-xl text-ink-muted">
        The page didn&apos;t load. Your taste profile and everything you&apos;ve rated are safe.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition-colors duration-quick hover:bg-accent-strong"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-pill bg-surface-overlay px-5 py-2 text-sm font-semibold text-ink transition-colors duration-quick hover:bg-surface-hover"
        >
          Back to home base
        </Link>
      </div>
    </section>
  );
}
