import { ArrowSquareOut } from "@phosphor-icons/react/ssr";

const PROVIDER: Record<string, string> = { tmdb: "TMDB", anilist: "AniList", rawg: "RAWG" };

/** Active link to the work's page on its data source. RAWG's terms require one on game pages. */
export function SourceLink({ source, href }: { source: string; href?: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex w-fit items-center gap-1 text-sm text-accent hover:underline"
    >
      View on {PROVIDER[source] ?? source}
      <ArrowSquareOut weight="regular" size={16} aria-hidden />
    </a>
  );
}
