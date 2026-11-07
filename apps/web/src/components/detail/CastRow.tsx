import { Section } from "./Section";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export function CastRow({ cast }: { cast: string[] }) {
  if (cast.length === 0) return null;
  return (
    <Section id="cast" title="Cast">
      <ul className="scrollbar-none flex gap-5 overflow-x-auto">
        {cast.map((name) => (
          <li key={name} className="flex w-28 shrink-0 flex-col gap-2.5">
            <span
              aria-hidden
              className="grid size-24 place-items-center rounded-pill bg-surface-overlay font-display text-2xl font-semibold text-ink-muted"
            >
              {initials(name)}
            </span>
            <span className="text-sm leading-snug font-medium text-ink">{name}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
