"use client";

import { Check } from "@phosphor-icons/react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & { label: ReactNode };

/** A native checkbox, drawn to match the design. The hit area is larger than the box. */
export function Checkbox({ label, className, ...input }: Props) {
  const id = useId();
  return (
    <div className={`flex items-start gap-3 ${className ?? ""}`}>
      <span className="relative mt-0.5 size-5 shrink-0">
        <input
          id={id}
          type="checkbox"
          className="peer absolute -inset-1.5 z-10 size-8 cursor-pointer opacity-0"
          {...input}
        />
        <span className="absolute inset-0 grid place-items-center rounded-tile border-[1.5px] border-ink-faint bg-surface-raised text-transparent transition-[background-color,border-color] duration-quick peer-hover:border-ink-muted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus peer-checked:border-highlight peer-checked:bg-chip-selected peer-checked:text-chip-selected-ink">
          <Check aria-hidden className="size-3.5" />
        </span>
      </span>
      <label htmlFor={id} className="cursor-pointer text-[0.9375rem] leading-normal text-ink">
        {label}
      </label>
    </div>
  );
}
