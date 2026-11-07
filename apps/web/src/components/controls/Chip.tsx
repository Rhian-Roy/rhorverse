import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const BASE =
  "inline-flex h-8.5 shrink-0 items-center gap-2 rounded-pill border px-4 text-sm font-medium whitespace-nowrap no-underline transition-[background-color,border-color,color,scale] duration-quick ease-standard active:scale-[0.97]";
const OFF = "border-line text-ink-muted hover:border-ink-faint hover:text-ink";
const ON = "border-chip-selected bg-chip-selected text-chip-selected-ink";

export const chipClass = (selected: boolean) => `${BASE} ${selected ? ON : OFF}`;

/** A filter chip that toggles (a button). `selected` also reaches screen readers as aria-pressed. */
export function Chip({
  selected = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} className={`${chipClass(selected)} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** A filter chip that navigates (a link). `selected` is the current page's filter. */
export function ChipLink({
  href,
  selected = false,
  children,
}: {
  href: string;
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-current={selected ? "true" : undefined} className={chipClass(selected)}>
      {children}
    </Link>
  );
}
