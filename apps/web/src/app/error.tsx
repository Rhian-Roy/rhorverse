"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass } from "@/components/controls/Button";

/** Shown when a page throws while rendering. Says what is safe, and offers the two obvious ways on. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <section role="alert" aria-labelledby="err-title" className="flex max-w-170 flex-col items-start gap-4 py-16 md:py-24">
      <h1 id="err-title" className="font-display text-display-l tracking-[-0.03em] text-balance text-ink">
        Couldn&apos;t load this page
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted">
        Something on our side didn&apos;t answer in time, so there&apos;s nothing to show yet. Your ratings and
        list are safe. This usually clears on the next try.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            reset();
            setTimeout(() => setRetrying(false), 1500);
          }}
        >
          {retrying ? "Trying again" : "Retry"}
        </Button>
        <Link href="/" className={buttonClass({ variant: "ghost", size: "lg" })}>
          Back to Home
        </Link>
      </div>
      {error.digest ? <p className="font-mono text-meta text-ink-faint">Error {error.digest}</p> : null}
    </section>
  );
}
