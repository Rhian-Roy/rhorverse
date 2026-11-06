"use client";

import { CheckCircle, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";

interface Props {
  title: string;
  body?: string;
  action?: { label: string; href: string };
  onDismiss: () => void;
  /** Closes itself after this many ms. 0 keeps it up until dismissed. */
  autoCloseMs?: number;
}

/** A success toast pinned to the bottom. role=status so a screen reader reads it once, politely. */
export function Toast({ title, body, action, onDismiss, autoCloseMs = 9000 }: Props) {
  useEffect(() => {
    if (!autoCloseMs) return;
    const t = setTimeout(onDismiss, autoCloseMs);
    return () => clearTimeout(t);
  }, [autoCloseMs, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-70 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto grid w-[min(27.5rem,100%)] grid-cols-[1.25rem_1fr_auto_auto] items-center gap-3 rounded-card border border-line bg-surface-overlay py-3 pr-2 pl-4 text-ink"
      >
        <CheckCircle aria-hidden className="size-5 text-success" />
        <div>
          <p className="text-[0.9375rem] font-medium">{title}</p>
          {body ? <p className="mt-0.5 text-meta text-ink-muted">{body}</p> : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            onClick={onDismiss}
            className="rounded-pill px-3 py-1.5 text-meta font-semibold text-link hover:bg-surface-hover"
          >
            {action.label}
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface-hover hover:text-ink"
        >
          <X aria-hidden />
        </button>
      </div>
    </div>
  );
}
