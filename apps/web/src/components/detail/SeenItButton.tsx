"use client";

import { Eye } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/controls/Button";
import { api } from "@/lib/api";
import { currentWho } from "@/lib/client-who";

/** Marks a work as seen (a `consumed` event), which removes it from recommendations. */
export function SeenItButton({
  workId,
  className,
  labels = ["Seen it", "Seen"],
}: {
  workId: string;
  className?: string;
  /** [before, after]: games say "Played it" / "Played". */
  labels?: readonly [string, string];
}) {
  const [seen, setSeen] = useState(false);

  async function markSeen() {
    if (seen) return;
    setSeen(true);
    try {
      await api.sendEvents([{ work_id: workId, kind: "consumed", weight: 1 }], await currentWho());
    } catch {
      setSeen(false);
    }
  }

  return (
    <Button variant="secondary" size="lg" aria-pressed={seen} onClick={() => void markSeen()} className={className}>
      <Eye aria-hidden className="size-5" />
      {seen ? labels[1] : labels[0]}
    </Button>
  );
}
