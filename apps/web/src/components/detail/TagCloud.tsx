export function TagCloud({ tags, facets = {} }: { tags: string[]; facets?: Record<string, string[]> }) {
  const groups = Object.entries(facets).filter(([, v]) => v.length > 0);
  if (tags.length === 0 && groups.length === 0) return null;
  return (
    <section aria-label="Tags" className="flex flex-col gap-3">
      {groups.map(([facet, values]) => (
        <div key={facet} className="flex flex-wrap items-center gap-2">
          <span className="text-xs tracking-wide text-ink-faint uppercase">{facet}</span>
          {values.map((v) => (
            <span key={v} className="rounded-pill bg-surface-overlay px-3 py-1 text-xs text-ink">
              {v}
            </span>
          ))}
        </div>
      ))}
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t} className="rounded-pill border border-line px-3 py-1 text-xs text-ink-muted">
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
