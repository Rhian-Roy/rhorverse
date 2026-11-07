import type { ReactNode } from "react";

/** Nothing to show yet, and what to do about it. The orbit is the brand mark with the planet taken out. */
export function EmptyState({
  title,
  children,
  actions,
  compact = false,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** Left-aligned and tighter: for a section, not a whole page. */
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col gap-2.5 ${compact ? "items-start p-4 text-left" : "mx-auto max-w-105 items-center px-6 py-12 text-center"}`}
    >
      <svg viewBox="0 0 64 32" aria-hidden className="mb-2 h-8 w-16 text-ink-faint">
        <ellipse
          cx="32"
          cy="16"
          rx="28"
          ry="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          transform="rotate(-18 32 16)"
        />
        <circle cx="54" cy="8" r="2.4" fill="currentColor" />
      </svg>
      <h2 className="font-display text-title leading-tight text-ink">{title}</h2>
      {children ? <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{children}</p> : null}
      {actions ? <div className={`mt-2.5 flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>{actions}</div> : null}
    </div>
  );
}
