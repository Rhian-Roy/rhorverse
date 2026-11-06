"use client";

import { BookmarkSimple, ThumbsDown, ThumbsUp } from "@phosphor-icons/react";
import { useState } from "react";
import { api } from "@/lib/api";
import { currentWho } from "@/lib/client-who";
import type { EventKind } from "@/lib/types";

const ACTIONS = [
  { kind: "like", label: "Loved it", Icon: ThumbsUp },
  { kind: "dislike", label: "Not for me", Icon: ThumbsDown },
  { kind: "save", label: "Save for later", Icon: BookmarkSimple },
] as const satisfies readonly { kind: EventKind; label: string; Icon: unknown }[];

/**
 * Sends like / dislike / save events for the anonymous cookie profile. v1 only records
 * turning an action on; turning it off just resets the button.
 */
export function FeedbackActions({ workId }: { workId: string }) {
  const [pressed, setPressed] = useState<Partial<Record<EventKind, boolean>>>({});
  const [failed, setFailed] = useState(false);

  async function toggle(kind: EventKind) {
    const on = !pressed[kind];
    setPressed((p) => ({ ...p, [kind]: on }));
    if (!on) return;
    try {
      await api.sendEvents([{ work_id: workId, kind, weight: 1 }], await currentWho());
      setFailed(false);
    } catch {
      setPressed((p) => ({ ...p, [kind]: false }));
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          type="button"
          aria-pressed={pressed[kind] ?? false}
          onClick={() => void toggle(kind)}
          className="flex items-center gap-2 rounded-pill bg-surface-overlay px-4 py-2 text-sm text-ink hover:bg-surface-hover aria-pressed:bg-chip-selected aria-pressed:text-chip-selected-ink"
        >
          <Icon weight="regular" size={20} />
          {label}
        </button>
      ))}
      {failed ? (
        <p role="status" className="text-sm text-ink-muted">
          Couldn&apos;t save that. Is the API running?
        </p>
      ) : null}
    </div>
  );
}
