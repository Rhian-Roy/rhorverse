import { Check } from "@phosphor-icons/react/dist/ssr";
import { Section } from "./Section";

// Shown elsewhere on the page: header chips and the cast row.
const NOT_TAGS = new Set(["cast", "runtime_min", "language", "format", "tracks", "episodes", "score", "artist", "native", "romaji", "platforms", "avg playtime", "metacritic", "developer"]);

const LABEL: Record<string, string> = { genres: "Genres", keywords: "Keywords", genre: "Genre" };

function Tag({ children, shared }: { children: string; shared: boolean }) {
  return shared ? (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-chip-selected px-3 text-meta text-chip-selected-ink">
      <Check aria-hidden className="size-3.5" />
      {children}
    </span>
  ) : (
    <span className="inline-flex h-7 items-center rounded-pill bg-surface-overlay px-3 text-meta text-ink">{children}</span>
  );
}

/** Genres, keywords and tags. A filled tag is one that matches the viewer's taste (`shared`). */
export function TagCloud({
  tags,
  facets = {},
  shared = [],
}: {
  tags: string[];
  facets?: Record<string, string[]>;
  shared?: string[];
}) {
  const groups = Object.entries(facets).filter(([key, values]) => values.length > 0 && !NOT_TAGS.has(key));
  // Tags are built from the same genres and keywords, so only list ones no group already shows.
  const grouped = new Set(groups.flatMap(([, values]) => values));
  const loose = tags.filter((t) => !grouped.has(t));
  if (groups.length === 0 && loose.length === 0) return null;
  const mine = new Set(shared.map((t) => t.toLowerCase()));
  const matches = [...groups.flatMap(([, v]) => v), ...loose].some((t) => mine.has(t.toLowerCase()));
  return (
    <Section id="tags" title="Tags">
      <div className="flex max-w-180 flex-col gap-3">
        {groups.map(([facet, values]) => (
          <div key={facet} className="flex flex-wrap items-center gap-2">
            <span className="min-w-18 font-mono text-meta text-ink-faint">{LABEL[facet] ?? facet}</span>
            {values.map((v) => (
              <Tag key={v} shared={mine.has(v.toLowerCase())}>
                {v}
              </Tag>
            ))}
          </div>
        ))}
        {loose.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {loose.map((t) => (
              <li key={t}>
                <Tag shared={mine.has(t.toLowerCase())}>{t}</Tag>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {matches ? <p className="mt-3 font-mono text-meta text-ink-faint">Filled tags match your taste</p> : null}
    </Section>
  );
}
