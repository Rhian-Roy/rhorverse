import type { ReactNode } from "react";

/** A titled block on a detail page: the title is the section's accessible name. */
export function Section({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="mb-4 font-display text-title text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
