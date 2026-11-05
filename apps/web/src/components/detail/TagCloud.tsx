// Shown elsewhere on the page: header chips and the cast row.
const NOT_TAGS = new Set(["cast", "runtime_min", "language", "format", "tracks", "episodes", "score", "artist", "native", "romaji"]);

const LABEL: Record<string, string> = { genres: "Genres", keywords: "Keywords", genre: "Genre" };

export function TagCloud({ tags, facets = {} }: { tags: string[]; facets?: Record<string, string[]> }) {
  const groups = Object.entries(facets).filter(([key, values]) => values.length > 0 && !NOT_TAGS.has(key));
  // Tags are built from the same genres and keywords, so only list ones no group already shows.
  const grouped = new Set(groups.flatMap(([, values]) => values));
  const loose = tags.filter((t) => !grouped.has(t));
  if (groups.length === 0 && loose.length === 0) return null;
  return (
    <section aria-label="Tags" className="flex flex-col gap-3">
      {groups.map(([facet, values]) => (
        <div key={facet} className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-meta text-ink-faint">{LABEL[facet] ?? facet}</span>
          {values.map((v) => (
            <span key={v} className="rounded-pill bg-surface-overlay px-3 py-1 text-xs text-ink">
              {v}
            </span>
          ))}
        </div>
      ))}
      {loose.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {loose.map((t) => (
            <li key={t} className="rounded-pill border border-line px-3 py-1 text-xs text-ink-muted">
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
