"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { currentWho } from "@/lib/client-who";

/**
 * Downloads everything stored for the caller as JSON. It's a fetch, not a link, because a signed-in
 * request needs the Authorization header.
 */
export function ExportButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function download() {
    setState("busy");
    try {
      const data = await api.exportData(await currentWho());
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "rhorverse-data.json" });
      a.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button type="button" onClick={() => void download()} disabled={state === "busy"} className={className}>
        {state === "busy" ? "Preparing…" : children}
      </button>
      {state === "error" ? (
        <span role="alert" className="text-sm text-danger">
          Couldn&apos;t export right now. Try again in a moment.
        </span>
      ) : null}
    </span>
  );
}
