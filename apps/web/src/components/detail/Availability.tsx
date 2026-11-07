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

const GROUPS: { title: string; kinds: Provider["kind"][]; empty: string }[] = [
  { title: "Stream", kinds: ["flatrate", "free", "ads"], empty: "Not streaming in India" },
  { title: "Rent", kinds: ["rent"], empty: "Not available to rent in India" },
  { title: "Buy", kinds: ["buy"], empty: "Not available to buy in India" },
];

function Row({ p }: { p: Provider }) {
  const inner = (
    <>
      <Logo provider={p} />
      <span className="text-[0.9375rem] font-medium">{p.name}</span>
      <span className="font-mono text-meta text-ink-muted">{KIND_LABEL[p.kind]}</span>
      {p.link ? (
        <ArrowUpRight
          aria-hidden
          className="text-ink-muted transition-[translate] duration-quick group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
        />
      ) : (
        <span />
      )}
    </>
  );
  return p.link ? (
    <a href={p.link} target="_blank" rel="noreferrer" className={`group ${ROW} hover:bg-surface-hover`}>
      {inner}
    </a>
  ) : (
    <div className={ROW}>{inner}</div>
  );
}

/** Where to watch in India (TMDB watch providers, data by JustWatch): Stream, Rent and Buy, one row per provider. */
export function Availability({ providers }: { providers: Provider[] }) {
  return (
    <section id="where-to-watch" aria-labelledby="where-to-watch-title" className="max-w-140 scroll-mt-24">
      <h2 id="where-to-watch-title" className="mb-4 font-display text-title text-ink">
        Where to watch in India
      </h2>
      {providers.length === 0 ? (
        <p className="py-2 text-ink-muted">No streaming options found yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {GROUPS.map(({ title, kinds, empty }) => {
            const rows = providers.filter((p) => kinds.includes(p.kind));
            return (
              <div key={title}>
                <h3 className="mb-1.5 font-mono text-meta text-ink-faint">{title}</h3>
                {rows.length > 0 ? (
                  <ul className="flex flex-col gap-0.5">
                    {rows.map((p) => (
                      <li key={`${p.kind}-${p.name}`}>
                        <Row p={p} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-ink-muted">{empty}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Credit source="justwatch" />
    </section>
  );
}
