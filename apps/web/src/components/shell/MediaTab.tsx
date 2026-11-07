import { ChipLink } from "@/components/controls/Chip";
import { Hero } from "@/components/hero/Hero";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { serverWho } from "@/lib/server-profile";
import type { FacetChip, MediaType } from "@/lib/types";

function ChipLinks({ chips, active }: { chips: FacetChip[]; active?: string }) {
  if (chips.length === 0) return null;
  const all = [{ value: "", label: "All" }, ...chips];
  return (
    <nav aria-label="Filter" className="scrollbar-none -m-1 flex gap-2 overflow-x-auto p-1">
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
  );
}

/** One media tab (Movies, TV, Anime, Music, Games): hero, chips and rails, personal when there's a profile. */
export async function MediaTab({ media, title, chip }: { media: MediaType; title: string; chip?: string }) {
  const feed = await api.media(media, await serverWho(), chip);
  const empty = feed.rails.length === 0;
  return (
    <>
      <h1 className="font-display text-display-l text-ink">{title}</h1>
      <ChipLinks chips={feed.chips} active={chip} />
      {feed.hero.length > 0 ? <Hero items={feed.hero} titleAs="h2" /> : null}
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
