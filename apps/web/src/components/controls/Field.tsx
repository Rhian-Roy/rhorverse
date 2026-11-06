"use client";

import { Warning } from "@phosphor-icons/react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  /** Sits inside the right edge of the control (the password reveal button). */
  trailing?: ReactNode;
};

/** A labelled text input. The error replaces the hint and is announced with the field. */
export function Field({ label, hint, error, trailing, disabled, className, ...input }: Props) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={`flex flex-col gap-2 ${disabled ? "opacity-45" : ""} ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={`flex h-12 items-center rounded-card border bg-surface-raised transition-colors duration-quick focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-focus ${
          error ? "border-danger" : "border-ink-faint hover:border-ink-muted focus-within:border-ink-muted"
        }`}
      >
        <input
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
          {...input}
        />
        {trailing ? <span className="flex items-center pr-1.5">{trailing}</span> : null}
      </div>
      {error ? (
        <p id={msgId} className="flex items-center gap-1.5 text-meta text-danger">
          <Warning aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-meta text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
