"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { PasswordField } from "@/components/controls/PasswordField";
import { MIN_PASSWORD } from "@/lib/password";
import { browserClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;
  const cannotSave = password.length < MIN_PASSWORD || confirm !== password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const supabase = browserClient();
    if (!supabase || cannotSave) return;
    setState("busy");
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setState("idle");
      setError(
        err.code === "reauthentication_needed"
          ? "For your security, sign out and sign in again, then change your password."
          : err.code === "same_password"
            ? "Choose a password you haven't used before."
            : err.code === "weak_password"
              ? "That password is too easy to guess. Try a longer one."
              : "Couldn't change your password. Try again in a moment.",
      );
      return;
    }
    await supabase.auth.signOut({ scope: "others" });
    setPassword("");
    setConfirm("");
    setState("saved");
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-110 flex-col gap-5">
      <PasswordField
        label="New password"
        autoComplete="new-password"
        showMeter
        value={password}
        error={error ?? undefined}
        onChange={(e) => {
          setPassword(e.target.value);
          setState("idle");
        }}
      />
      <Field
        label="Type it again"
        type="password"
        autoComplete="new-password"
        value={confirm}
        error={mismatch ? "These don't match yet. Check the last few characters." : undefined}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={cannotSave || state === "busy"}>
          {state === "busy" ? "Saving…" : "Change password"}
        </Button>
        <span role="status" className="text-sm text-ink-muted">
          {state === "saved" ? "Password changed. Your other devices were signed out." : ""}
        </span>
      </div>
      <p className="text-sm text-ink-faint">Signed up with Google? Setting a password here lets you use either one.</p>
    </form>
  );
}
