export function CastRow({ cast }: { cast: string[] }) {
  if (cast.length === 0) return null;
  return (
    <section aria-labelledby="cast" className="flex flex-col gap-3">
      <h2 id="cast" className="font-display text-title text-ink">
        Cast
      </h2>
      <ul className="flex flex-wrap gap-2">
        {cast.map((name) => (
          <li key={name} className="rounded-pill bg-surface-overlay px-3 py-1 text-sm text-ink">
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
