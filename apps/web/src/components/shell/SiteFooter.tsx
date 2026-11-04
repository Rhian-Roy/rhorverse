import Link from "next/link";
import { CREDITS, type CreditSource } from "@/components/attribution/Credit";

// Sources whose data can appear on any page (rails, search). RAWG requires an active link wherever
// its data shows; the full list lives on /about.
const SITE_WIDE: { source: CreditSource; label: string }[] = [
  { source: "tmdb", label: "TMDB" },
  { source: "justwatch", label: "JustWatch" },
  { source: "anilist", label: "AniList" },
  { source: "rawg", label: "RAWG" },
  { source: "itunes", label: "Apple" },
];

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-screen-2xl px-6 pt-4 pb-28 text-xs text-ink-faint">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Data from</span>
        {SITE_WIDE.map(({ source, label }) => (
          <a
            key={source}
            href={CREDITS[source].href}
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink-muted hover:underline"
          >
            {label}
          </a>
        ))}
        <span aria-hidden>·</span>
        <Link href="/about" className="hover:text-ink-muted hover:underline">
          All credits
        </Link>
      </p>
    </footer>
  );
}
