"use client";

import { Chip as ChipButton } from "@/components/controls/Chip";

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
    <div role="group" aria-label={label} className="scrollbar-none -m-1 flex gap-2 overflow-x-auto p-1">
      {all.map((chip) => (
        <ChipButton key={chip.value ?? "all"} selected={chip.value === value} onClick={() => onChange(chip.value)}>
          {chip.label}
        </ChipButton>
      ))}
    </div>
  );
}
