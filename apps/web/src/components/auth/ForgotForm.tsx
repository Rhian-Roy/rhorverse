"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { browserClient } from "@/lib/supabase/client";
import { AccountsOff, FormAlert } from "./AuthShell";

export function ForgotForm() {
  const supabase = browserClient();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!supabase) return <AccountsOff />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    if (!email.includes("@")) {
      setError("Enter the email you signed up with.");
      return;
    }
    setState("busy");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    // Same answer whether or not the address has an account, so this can't be used to find out.
    if (err && err.status === 429) {
      setState("idle");
      setError("We can't send more emails right now. Try again in a little while.");
      return;
    }
    setState("sent");
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {state === "sent" ? (
        <div role="status" className="flex gap-3 rounded-card border border-line bg-surface-raised px-4 py-3.5">
          <CheckCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
          <span className="text-[0.9375rem] leading-normal">
            <strong className="font-semibold">Reset link sent.</strong> If that email has an account, the link
            arrives in a minute.
          </span>
        </div>
      ) : (
        <Button type="submit" size="lg" full disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : "Send reset link"}
        </Button>
      )}
      <p className="text-sm leading-normal text-ink-faint">
        Signed up with Google? You don&apos;t have a Rhorverse password. Use Continue with Google on the sign-in page.
      </p>
    </form>
  );
}
