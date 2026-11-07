"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState } from "react";
import { api } from "@/lib/api";
import { currentWho } from "@/lib/client-who";
import { announce } from "@/lib/toast";
import type { EventKind, Work } from "@/lib/types";

const ACTIONS = [
  { action: "seen", kind: "consumed", label: "Seen it", key: "S", Icon: Eye },
  { action: "not-interested", kind: "dislike", label: "Not interested", key: "X", Icon: EyeSlash },
] as const satisfies readonly { action: string; kind: EventKind; label: string; key: string; Icon: unknown }[];

/**
 * Seen it / Not interested for one tile. Both stop the work being recommended again; the caller
 * removes the tile once the event is saved. Live mode only: snapshot mode has no API to tell.
 */
export function TileActions({ work, onDone }: { work: Work; onDone?: (id: string) => void }) {
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(kind: EventKind) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await api.sendEvents([{ work_id: work.id, kind, weight: 1 }], await currentWho());
      onDone?.(work.id);
      announce(
        kind === "consumed"
          ? { title: `Marked ${work.title} as seen`, body: "We’ll stop suggesting it. Rate it from its page to tune For you." }
          : { title: `Hidden: ${work.title}`, body: "We’ll stop suggesting it." },
      );
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div
      className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity duration-quick group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 pointer-coarse:opacity-100"
    >
      {ACTIONS.map(({ action, kind, label, key, Icon }) => (
        <button
          key={action}
          type="button"
          data-action={action}
          disabled={busy}
          title={`${label} (${key})`}
          aria-label={`${label}: ${work.title}`}
          onClick={() => void send(kind)}
          className={`grid size-8 place-items-center rounded-pill bg-surface/85 text-ink transition-colors duration-quick hover:bg-chip-selected hover:text-chip-selected-ink disabled:opacity-60 ${failed ? "text-danger" : ""}`}
        >
          <Icon size={18} />
        </button>
      ))}
      {failed ? (
        <span role="status" className="sr-only">
          Couldn&apos;t save that. Is the API running?
        </span>
      ) : null}
    </div>
  );
}
