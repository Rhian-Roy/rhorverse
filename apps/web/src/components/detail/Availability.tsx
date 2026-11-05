import { Credit } from "@/components/attribution/Credit";
import type { Provider } from "@/lib/types";

const KIND_LABEL: Record<Provider["kind"], string> = {
  flatrate: "Stream",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

/** Where to watch in India (TMDB watch providers, data by JustWatch). */
export function Availability({ providers }: { providers: Provider[] }) {
  return (
    <section aria-labelledby="where-to-watch" className="flex flex-col gap-3">
      <h2 id="where-to-watch" className="font-display text-title text-ink">
        Where to watch in India
      </h2>
      {providers.length === 0 ? (
        <p className="text-sm text-ink-muted">No streaming options found yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <li key={`${p.kind}-${p.name}`} className="rounded-tile bg-surface-raised px-3 py-2 text-sm text-ink">
              {p.name} <span className="text-ink-faint">· {KIND_LABEL[p.kind]}</span>
            </li>
          ))}
        </ul>
      )}
      <Credit source="justwatch" />
    </section>
  );
}
