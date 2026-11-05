/** The mark and name, inline so the name uses the display font and follows the theme. */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-ink">
      <svg viewBox="0 0 32 32" aria-hidden className="size-7 text-accent">
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        <ellipse
          cx="16"
          cy="16"
          rx="14"
          ry="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          transform="rotate(-28 16 16)"
        />
        <circle cx="27.4" cy="10" r="1.8" className="fill-ink" />
      </svg>
      <span className="font-display text-title tracking-tight">rhorverse</span>
    </span>
  );
}
