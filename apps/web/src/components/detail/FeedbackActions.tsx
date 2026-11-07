"use client";

import { BookmarkSimple, ThumbsUp } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/controls/Button";
import { api } from "@/lib/api";
import { currentWho } from "@/lib/client-who";
import type { EventKind } from "@/lib/types";
import { SeenItButton } from "./SeenItButton";

const ACTIONS = [
  { kind: "like", label: "Loved it", Icon: ThumbsUp, variant: "secondary" },
  { kind: "save", label: "Save for later", Icon: BookmarkSimple, variant: "secondary" },
  { kind: "dislike", label: "Not interested", Icon: null, variant: "ghost" },
] as const satisfies readonly { kind: EventKind; label: string; Icon: unknown; variant: "secondary" | "ghost" }[];

/**
 * Seen it, Loved it, Save for later and Not interested for the signed-in account or the guest cookie
 * profile. v1 only records turning an action on; turning it off just resets the button.
 */
export function FeedbackActions({
  workId,
  seenLabels,
}: {
  workId: string;
  seenLabels?: readonly [string, string];
}) {
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
    <div className="flex flex-wrap items-center gap-2.5">
      <SeenItButton workId={workId} labels={seenLabels} />
      {ACTIONS.map(({ kind, label, Icon, variant }) => (
        <Button
          key={kind}
          variant={variant}
          size="lg"
          aria-pressed={!!pressed[kind]}
          onClick={() => void toggle(kind)}
        >
          {Icon ? <Icon aria-hidden className="size-5" /> : null}
          {label}
        </Button>
      ))}
      {failed ? (
        <span role="alert" className="text-sm text-danger">
          Couldn&apos;t save that. Try again.
        </span>
      ) : null}
    </div>
  );
}
