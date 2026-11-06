"use client";

import { X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { deleteAccount } from "@/app/account/actions";
import { Button } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { hardNavigate } from "@/lib/hard-navigate";
import { browserClient } from "@/lib/supabase/client";
import { ExportButton } from "./ExportButton";

const ROW = "flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line py-4.5";

export function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await browserClient()?.auth.signOut({ scope: "global" });
          hardNavigate("/");
        }}
      >
        Sign out of all devices
      </Button>
      <span className="text-sm text-ink-faint">Includes this one. You&apos;ll need to sign in again everywhere.</span>
    </div>
  );
}

export function PrivacyActions() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed === "DELETE";

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await deleteAccount(); // redirects away on success
    if (result && !result.ok) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className={ROW}>
        <div className="min-w-60 flex-1">
          <p className="text-[0.9375rem] font-medium">Export my data</p>
          <p className="mt-1 text-sm leading-normal text-ink-muted">
            A JSON file of your account, ratings, lists and imports. It downloads straight away.
          </p>
        </div>
        <ExportButton className="inline-flex h-10 items-center rounded-pill bg-surface-overlay px-5 text-sm font-semibold text-ink hover:bg-surface-hover disabled:opacity-40">
          Export my data
        </ExportButton>
      </div>
      <div className={`${ROW} border-b`}>
        <div className="min-w-60 flex-1">
          <p className="text-[0.9375rem] font-medium">Delete account</p>
          <p className="mt-1 text-sm leading-normal text-ink-muted">
            Removes your account and everything in it for good. Your Netflix, AniList and Steam accounts aren&apos;t touched.
          </p>
        </div>
        <Dialog.Root
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setTyped("");
              setError(null);
            }
          }}
        >
          <Dialog.Trigger asChild>
            <Button variant="secondary">Delete account</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-80 bg-surface/80" />
            <Dialog.Content className="fixed top-1/2 left-1/2 z-81 max-h-[calc(100svh-3rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-sheet border border-line bg-surface-raised p-6">
              <div className="flex items-start justify-between gap-4">
                <Dialog.Title className="font-display text-xl font-semibold tracking-tight">Delete your account?</Dialog.Title>
                <Dialog.Close
                  aria-label="Close"
                  className="grid size-8 shrink-0 place-items-center rounded-pill text-ink-muted hover:bg-surface-overlay hover:text-ink"
                >
                  <X aria-hidden />
                </Dialog.Close>
              </div>
              <Dialog.Description className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
                This removes your ratings, lists, imports and taste profile for good. It can&apos;t be undone.
              </Dialog.Description>
              <div className="mt-5 flex flex-col gap-5">
                <Field
                  label="Type DELETE to confirm"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  hint={confirmed ? "Confirmed. Delete account is now available." : "Capital letters, exactly as shown."}
                />
                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <Button variant="ghost">Keep my account</Button>
                  </Dialog.Close>
                  <Button disabled={!confirmed || busy} onClick={() => void remove()}>
                    {busy ? "Deleting…" : "Delete account"}
                  </Button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <p className="mt-3 text-sm">
        <Link href="/privacy" className="text-link hover:underline">
          Read the Privacy notice
        </Link>
      </p>
    </div>
  );
}
