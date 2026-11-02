"use client";

import { UploadSimple, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { ensureProfileId } from "@/lib/profile";
import type { ImportResult, ImportSource } from "@/lib/types";

const SOURCES: Record<ImportSource, { title: string; hint: string; input: "file" | "username" }> = {
  netflix: { title: "Netflix", hint: "Upload ViewingActivity.csv from your Netflix data export.", input: "file" },
  letterboxd: { title: "Letterboxd", hint: "Upload watched.csv or ratings.csv from your export.", input: "file" },
  anilist: { title: "AniList", hint: "Enter your public AniList username.", input: "username" },
  steam: { title: "Steam", hint: "Enter your SteamID64 (profile must be public).", input: "username" },
};

// Only Letterboxd has an importer so far.
const WIRED: ReadonlySet<ImportSource> = new Set(["letterboxd"]);

type Phase =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; result: ImportResult }
  | { kind: "error"; message: string };

export function ImportCard({ source }: { source: ImportSource }) {
  const meta = SOURCES[source];
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (api.mode !== "live") {
      setPhase({ kind: "error", message: "Imports need the live API (API_MODE=live)." });
      return;
    }
    if (!WIRED.has(source)) {
      setPhase({ kind: "error", message: `The ${meta.title} importer isn't ready yet.` });
      return;
    }
    const file = new FormData(e.currentTarget).get("file");
    if (!(file instanceof File)) return;
    setPhase({ kind: "busy" });
    try {
      const result = await api.importCsv(source, ensureProfileId(), await file.text());
      setPhase(
        result.status === "done"
          ? { kind: "done", result }
          : { kind: "error", message: "The import failed. Try again in a moment." },
      );
    } catch {
      setPhase({ kind: "error", message: "Couldn't reach the API, or the file isn't a valid export." });
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPhase({ kind: "idle" });
      }}
    >
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-5">
        <h2 className="font-display text-lg font-semibold text-ink">{meta.title}</h2>
        <p className="text-sm text-ink-muted">{meta.hint}</p>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="flex w-fit items-center gap-2 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
          >
            <UploadSimple />
            Import from {meta.title}
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-surface/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto h-fit w-[min(28rem,90vw)] rounded-xl border border-line bg-surface-overlay p-6">
          <Dialog.Title className="font-display text-xl font-semibold text-ink">Import from {meta.title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-muted">{meta.hint}</Dialog.Description>
          <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
            {meta.input === "file" ? (
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                aria-label="Export file"
                className="text-sm text-ink-muted"
              />
            ) : (
              <input
                type="text"
                required
                name="username"
                placeholder="username"
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
              />
            )}
            <button
              type="submit"
              disabled={phase.kind === "busy"}
              className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
            >
              {phase.kind === "busy" ? "Importing…" : "Start import"}
            </button>
          </form>
          <div role="status" aria-live="polite" className="mt-4 text-sm text-ink-muted">
            {phase.kind === "busy" ? <p>Matching films. Missing ones are fetched from TMDB, so this can take a while.</p> : null}
            {phase.kind === "error" ? <p>{phase.message}</p> : null}
            {phase.kind === "done" ? <ImportSummary result={phase.result} /> : null}
          </div>
          <Dialog.Close
            aria-label="Close"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-pill text-ink-muted hover:text-ink"
          >
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ink">
        Matched {result.matched} · fetched {result.fetched} · {result.unmatched} not found
      </p>
      {result.unmatched_titles.length ? (
        <details>
          <summary className="cursor-pointer">Not found</summary>
          <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5">
            {result.unmatched_titles.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p>Seen films are now left out of your recommendations.</p>
    </div>
  );
}
