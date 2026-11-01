"use client";

export interface Chip<T extends string> {
  value: T;
  label: string;
}

/** Single-select filter chips (`null` = all). */
export function ChipBar<T extends string>({
  chips,
  value,
  onChange,
  label = "Filters",
}: {
  chips: Chip<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  label?: string;
}) {
  const all: Array<Chip<T> | { value: null; label: string }> = [{ value: null, label: "All" }, ...chips];
  return (
    <div role="group" aria-label={label} className="scrollbar-none flex gap-2 overflow-x-auto">
      {all.map((chip) => (
        <button
          key={chip.value ?? "all"}
          type="button"
          aria-pressed={chip.value === value}
          onClick={() => onChange(chip.value)}
          className="shrink-0 rounded-pill border border-line px-4 py-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
