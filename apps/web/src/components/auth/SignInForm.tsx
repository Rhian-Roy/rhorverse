"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { PasswordField } from "@/components/controls/PasswordField";
import { hardNavigate } from "@/lib/hard-navigate";
import { browserClient } from "@/lib/supabase/client";
import { AccountsOff, FormAlert, OrDivider, TextLink } from "./AuthShell";
import { GoogleButton } from "./GoogleButton";

const LINK_ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or ask for a new one.",
  session: "We couldn't start your session. Please sign in again.",
};

export function SignInForm({ next, initialError }: { next: string; initialError?: string }) {
  const supabase = browserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ? (LINK_ERRORS[initialError] ?? null) : null);
  const [busy, setBusy] = useState(false);

  if (!supabase) return <AccountsOff />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setBusy(false);
      setError(
        err.code === "email_not_confirmed"
          ? "Confirm your email first: we sent you a link when you signed up."
          : err.status === 429
            ? "Too many attempts. Wait a minute and try again."
            : "That email and password don't match. Check them, or reset your password.",
      );
      return;
    }
    // A full navigation, so the server reads the new session cookie and can merge guest activity.
    hardNavigate(`/auth/callback?${new URLSearchParams({ next })}`);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <GoogleButton next={next} />
      <OrDivider />
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="flex flex-col gap-2">
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link href="/forgot-password" className="self-end rounded-tile text-sm font-medium text-link hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="mt-1 text-center text-[0.9375rem] text-ink-muted">
        New here? <TextLink href={`/sign-up?${new URLSearchParams({ next })}`}>Create an account</TextLink>
      </p>
      <p className="mt-2 border-t border-line pt-4 text-center text-sm leading-normal text-ink-faint">
        <TextLink href="/">Continue as guest</TextLink> · browse and rate now, and we keep it when you sign in
      </p>
    </form>
  );
}
