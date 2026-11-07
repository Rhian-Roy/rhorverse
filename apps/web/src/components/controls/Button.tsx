import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

// A toggled button (aria-pressed) reads as selected, the same green as a selected chip.
const PRESSED = "aria-pressed:bg-chip-selected aria-pressed:text-chip-selected-ink";
const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong",
  secondary: `bg-surface-overlay text-ink hover:bg-surface-hover ${PRESSED}`,
  ghost: `bg-transparent text-ink-muted hover:bg-surface-overlay hover:text-ink ${PRESSED}`,
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3.5 text-meta",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

/** Class names for anything that should look like a button (a Link, say). */
export function buttonClass({
  variant = "primary",
  size = "md",
  full = false,
}: { variant?: Variant; size?: Size; full?: boolean } = {}): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap no-underline",
    "transition-[background-color,color,scale] duration-quick ease-standard active:scale-[0.97]",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
    VARIANT[variant],
    SIZE[size],
    full ? "w-full" : "",
  ].join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; full?: boolean };

export function Button({ variant, size, full, className, type = "button", ...rest }: Props) {
  return <button type={type} className={`${buttonClass({ variant, size, full })} ${className ?? ""}`} {...rest} />;
}
