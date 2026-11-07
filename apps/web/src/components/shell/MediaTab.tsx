import { ChipLink } from "@/components/controls/Chip";
import { Hero } from "@/components/hero/Hero";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { serverWho } from "@/lib/server-profile";
import type { FacetChip, MediaType } from "@/lib/types";

// What the tab's chips filter by (the API picks one facet per medium).
const CHIP_LABEL: Record<MediaType, string> = {
  movie: "Language",
  tv: "Language",
  anime: "Format",
  music: "Genre",
  game: "Platform",
};

function Filters({ media, chips, active }: { media: MediaType; chips: FacetChip[]; active?: string }) {
  if (chips.length === 0) return null;
  const all = [{ value: "", label: "All" }, ...chips];
  return (
    <div className="flex items-center gap-x-6 gap-y-2 max-sm:flex-col max-sm:items-start">
      <span className="w-21 shrink-0 text-sm font-medium text-ink-muted">{CHIP_LABEL[media]}</span>
      <nav aria-label={`Filter by ${CHIP_LABEL[media].toLowerCase()}`} className="scrollbar-none -m-1 flex min-w-0 gap-2 overflow-x-auto p-1">
        {all.map((chip) => (
          <ChipLink
            key={chip.value}
            href={chip.value ? `?chip=${encodeURIComponent(chip.value)}` : "?"}
            selected={chip.value === (active ?? "")}
          >
            {chip.label}
          </ChipLink>
        ))}
      </nav>
    </div>
  );
}

/**
 * One media tab (Movies, TV, Anime, Music, Games): a featured hero under the clear nav, a labelled
 * filter row, then rails. Personal when there's a profile. The page title stays for screen readers
 * when a hero carries the visible heading.
 */
export async function MediaTab({ media, title, chip }: { media: MediaType; title: string; chip?: string }) {
  const feed = await api.media(media, await serverWho(), chip);
  const empty = feed.rails.length === 0;
  const hasHero = feed.hero.length > 0;
  return (
    <>
      {hasHero ? <Hero items={feed.hero} titleAs="h2" compact label={`Featured ${title.toLowerCase()}`} /> : null}
      <h1 className={hasHero ? "sr-only" : "font-display text-display-l text-ink"}>{title}</h1>
      <Filters media={media} chips={feed.chips} active={chip} />
      {empty ? (
        <p className="max-w-xl text-ink-muted">
          {chip ? "Nothing matches this filter yet." : `Nothing here yet. The ${title.toLowerCase()} catalogue hasn't been loaded.`}
        </p>
      ) : (
        feed.rails.map((rail) => <Rail key={rail.id} rail={rail} />)
      )}
    </>
  );
}
