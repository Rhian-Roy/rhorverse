"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ensureProfileId } from "@/lib/profile";

/** Marks a work as seen (a `consumed` event), which removes it from recommendations. */
export function SeenItButton({ workId }: { workId: string }) {
  const [seen, setSeen] = useState(false);

  async function markSeen() {
    if (seen) return;
    setSeen(true);
    try {
      await api.sendEvents([{ profile_id: ensureProfileId(), work_id: workId, kind: "consumed", weight: 1 }]);
    } catch {
      setSeen(false);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={seen}
      onClick={() => void markSeen()}
      className="rounded-pill bg-surface-overlay px-5 py-2 text-sm font-semibold text-ink transition-colors duration-quick hover:bg-surface-hover aria-pressed:bg-chip-selected aria-pressed:text-chip-selected-ink"
    >
      {seen ? "Seen" : "Seen it"}
    </button>
  );
}
