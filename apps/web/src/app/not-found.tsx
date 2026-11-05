import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 py-24">
      <p className="font-display text-display-xl leading-none font-bold text-highlight">404</p>
      <h1 className="font-display text-display-l text-ink">This corner of the Rhorverse is uncharted.</h1>
      <p className="text-ink-muted">Whatever you were looking for isn&apos;t here.</p>
      <Link href="/" className="rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-accent-ink">
        Back to home base
      </Link>
    </section>
  );
}
