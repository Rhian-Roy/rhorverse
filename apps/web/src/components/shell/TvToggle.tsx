"use client";

import { Television } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";
import { TV_KEY } from "@/lib/tv";

const noop = () => () => {};

/** Reloads on change, because spatial navigation boots once at startup. */
export function TvToggle() {
  const on = useSyncExternalStore(
    noop,
    () => document.documentElement.dataset.tv === "true",
    () => false,
  );
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        try {
          localStorage.setItem(TV_KEY, on ? "off" : "on");
        } catch {
          // Private mode: `?tv=1` still works.
        }
        window.location.reload();
      }}
      className="flex w-fit items-center gap-2 rounded-pill bg-surface-overlay px-4 py-2 text-sm text-ink transition-colors duration-quick hover:bg-surface-hover aria-pressed:bg-chip-selected aria-pressed:text-chip-selected-ink"
    >
      <Television />
      TV mode
    </button>
  );
}
