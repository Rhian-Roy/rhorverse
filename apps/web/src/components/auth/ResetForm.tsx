"use client";

import { useState, type FormEvent } from "react";
import { Button, buttonClass } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { PasswordField } from "@/components/controls/PasswordField";
import { MIN_PASSWORD } from "@/lib/password";
import { browserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AccountsOff, FormAlert } from "./AuthShell";

export function ResetForm({ email }: { email: string }) {
  const supabase = browserClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!supabase) return <AccountsOff />;

  const mismatch = confirm.length > 0 && confirm !== password;
  const cannotSave = mismatch || password.length < MIN_PASSWORD || confirm.length === 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || cannotSave) return;
    setState("busy");
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setState("idle");
      setError(
        err.code === "same_password"
          ? "Choose a password you haven't used before."
          : err.code === "weak_password"
            ? "That password is too easy to guess. Try a longer one."
            : "Couldn't save the new password. The link may have expired: request a new one.",
      );
      return;
    }
    await supabase.auth.signOut({ scope: "others" }); // the old password stops working everywhere else
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-lg leading-relaxed text-ink-muted">
          Your password is updated, and you&apos;re signed in here.
        </p>
        <Link href="/" className={buttonClass({ size: "lg", full: true })}>
          Continue to Rhorverse
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <p className="text-lg leading-relaxed text-ink-muted">
        For <strong className="font-semibold text-ink">{email}</strong>. Saving it signs you out on your other devices.
      </p>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <PasswordField
        label="New password"
        autoComplete="new-password"
        showMeter
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="Type it again"
        type="password"
        autoComplete="new-password"
        value={confirm}
        error={mismatch ? "These don't match yet. Check the last few characters." : undefined}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <Button type="submit" size="lg" full disabled={cannotSave || state === "busy"}>
        {state === "busy" ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
