"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass, Button } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";

/** A missing page: the address that failed, a way to search for it, and Home. */
export default function NotFound() {
  const pathname = usePathname();
  return (
    <section aria-labelledby="nf-title" className="flex flex-col gap-6 py-12 md:py-20">
      <span aria-hidden className="font-display text-[clamp(6rem,18vw,12rem)] leading-[0.85] font-bold tracking-[-0.04em] text-surface-hover">
        404
      </span>
      <div className="flex max-w-150 flex-col items-start gap-4">
        <p className="font-mono text-meta break-all text-ink-faint">{pathname}</p>
        <h1 id="nf-title" className="font-display text-display-l tracking-[-0.03em] text-balance text-ink">
          Nothing lives at this address
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          The link may have a typo, or the page moved when its listing was updated. Search for what you were after,
          or head back Home.
        </p>
        <form role="search" action="/search" className="flex w-full items-end gap-3">
          <Field label="Or search for it" type="search" name="q" autoComplete="off" className="flex-1" />
          <Button type="submit" variant="secondary" size="lg">
            Search
          </Button>
        </form>
        <Link href="/" className={buttonClass({ size: "lg" })}>
          Go to Home
        </Link>
      </div>
    </section>
  );
}
