import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { Credit } from "@/components/attribution/Credit";
import type { Provider } from "@/lib/types";

const KIND_LABEL: Record<Provider["kind"], string> = {
  flatrate: "Stream",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

const ROW =
  "grid grid-cols-[2.5rem_1fr_auto_1.125rem] items-center gap-3.5 rounded-card px-3 py-2.5 text-ink no-underline transition-colors duration-quick";

function Logo({ provider }: { provider: Provider }) {
  return (
    <span
      aria-hidden
      className="relative grid size-10 place-items-center overflow-hidden rounded-tile bg-surface-overlay font-display font-semibold text-ink-muted"
    >
      {provider.logo ? <Image src={provider.logo} alt="" fill sizes="40px" className="object-cover" /> : provider.name[0]}
    </span>
  );
}

/** Where to watch in India (TMDB watch providers, data by JustWatch): one row per provider. */
export function Availability({ providers }: { providers: Provider[] }) {
  return (
    <section aria-labelledby="where-to-watch" className="max-w-140">
      <h2 id="where-to-watch" className="mb-4 font-display text-title text-ink">
        Where to watch in India
      </h2>
      {providers.length === 0 ? (
        <p className="py-2 text-ink-muted">No streaming options found yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {providers.map((p) => {
            const inner = (
              <>
                <Logo provider={p} />
                <span className="text-[0.9375rem] font-medium">{p.name}</span>
                <span className="font-mono text-meta text-ink-muted">{KIND_LABEL[p.kind]}</span>
                {p.link ? <ArrowUpRight aria-hidden className="text-ink-muted transition-[translate] duration-quick group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" /> : <span />}
              </>
            );
            return (
              <li key={`${p.kind}-${p.name}`}>
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noreferrer" className={`group ${ROW} hover:bg-surface-hover`}>
                    {inner}
                  </a>
                ) : (
                  <div className={ROW}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Credit source="justwatch" />
    </section>
  );
}
