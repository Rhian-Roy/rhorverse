"use client";

import { UploadSimple, X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { ImportSource } from "@/lib/types";

const SOURCES: Record<ImportSource, { title: string; hint: string; input: "file" | "username" }> = {
  netflix: { title: "Netflix", hint: "Upload ViewingActivity.csv from your Netflix data export.", input: "file" },
  letterboxd: { title: "Letterboxd", hint: "Upload watched.csv or ratings.csv from your export.", input: "file" },
  anilist: { title: "AniList", hint: "Enter your public AniList username.", input: "username" },
  steam: { title: "Steam", hint: "Enter your SteamID64 (profile must be public).", input: "username" },
};

export function ImportCard({ source }: { source: ImportSource }) {
  const meta = SOURCES[source];
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
          <form
            className="mt-5 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: POST /imports/{source} once the API importer lands.
              setOpen(false);
            }}
          >
            {meta.input === "file" ? (
              <input type="file" accept=".csv" required className="text-sm text-ink-muted" />
            ) : (
              <input
                type="text"
                required
                placeholder="username"
                className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
              />
            )}
            <button type="submit" className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
              Start import
            </button>
          </form>
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
