"use client";

import { Warning } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/controls/Button";
import { Checkbox } from "@/components/controls/Checkbox";
import { Field } from "@/components/controls/Field";
import { PasswordField } from "@/components/controls/PasswordField";
import { MIN_PASSWORD } from "@/lib/password";
import { hardNavigate } from "@/lib/hard-navigate";
import { browserClient } from "@/lib/supabase/client";
import { AccountsOff, AuthHeading, FormAlert, OrDivider, TextLink } from "./AuthShell";
import { GoogleButton } from "./GoogleButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_AFTER_S = 30;

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  adult?: string;
  consent?: string;
}

function validate(v: { name: string; email: string; password: string; adult: boolean; consent: boolean }): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "Add your name so we know what to call you.";
  const email = v.email.trim();
  if (!email) errors.email = "Add your email so we can send a sign-in link.";
  else if (!email.includes("@")) errors.email = "Add an @, like rhian@gmail.com.";
  else if (!EMAIL_RE.test(email)) errors.email = "Finish the part after @, like gmail.com.";
  if (v.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (!v.adult) errors.adult = "Confirm you're 18 or older to create an account.";
  if (!v.consent) errors.consent = "Confirm you've read the Privacy notice to create an account.";
  return errors;
}

function FieldError({ children }: { children: string }) {
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-meta text-danger">
      <Warning aria-hidden className="size-4 shrink-0" />
      {children}
    </p>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const supabase = browserClient();
  const [values, setValues] = useState({ name: "", email: "", password: "", adult: false, consent: false });
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!supabase) return <AccountsOff />;
  if (sentTo) return <CheckEmail email={sentTo} onChange={() => setSentTo(null)} />;

  const errors = validate(values);
  if (emailTaken && !errors.email) errors.email = "That email already has an account. Sign in instead.";
  const shown: Errors = submitted ? errors : {};
  const count = Object.keys(shown).length;
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setEmailTaken(false);
    setValues((v) => ({ ...v, [key]: value }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (!supabase || Object.keys(validate(values)).length > 0) return;
    setBusy(true);
    const email = values.email.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?${new URLSearchParams({ next })}`,
        // Read by the API on the first request. The timestamp is set there, not here.
        data: { full_name: values.name.trim(), age_confirmed: true, privacy_consent: true },
      },
    });
    setBusy(false);
    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") setEmailTaken(true);
      else if (error.code === "weak_password") setServerError("That password is too easy to guess. Try a longer one.");
      else if (error.code === "over_email_send_rate_limit" || error.status === 429)
        setServerError("We can't send more emails right now. Try again in a little while.");
      else setServerError("Something went wrong creating your account. Please try again.");
      return;
    }
    // Supabase hides whether an address is taken, but returns no identities when it already is.
    if (data.user && data.user.identities?.length === 0) {
      setEmailTaken(true);
      return;
    }
    if (data.session) hardNavigate(`/auth/callback?${new URLSearchParams({ next })}`);
    else setSentTo(email);
  }

  return (
    <>
      <AuthHeading title="Create an account" lead="Free. Keeps your ratings, lists and imports in sync." />
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
        {count > 0 ? (
          <FormAlert>
            {count === 1 ? "1 thing" : `${count} things`} to fix before we can create your account.
          </FormAlert>
        ) : null}
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <GoogleButton
          next={next}
          consent
          onBlocked={() => {
            setSubmitted(true);
            return !!(errors.adult || errors.consent);
          }}
        />
        <OrDivider />
        <Field
          label="Name"
          autoComplete="name"
          hint="Shown on your profile"
          value={values.name}
          error={shown.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={shown.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          showMeter
          value={values.password}
          error={shown.password}
          onChange={(e) => set("password", e.target.value)}
        />
        <div>
          <Checkbox label="I’m 18 or older" checked={values.adult} onChange={(e) => set("adult", e.target.checked)} />
          {shown.adult ? <FieldError>{shown.adult}</FieldError> : null}
        </div>
        <div>
          <Checkbox
            label={
              <>
                I’ve read the <TextLink href="/privacy">Privacy notice</TextLink>, which explains what we store and
                how to delete it
              </>
            }
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
          />
          {shown.consent ? <FieldError>{shown.consent}</FieldError> : null}
        </div>
        <Button type="submit" size="lg" full disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="mt-1 text-center text-[0.9375rem] text-ink-muted">
          Already have an account? <TextLink href={`/sign-in?${new URLSearchParams({ next })}`}>Sign in</TextLink>
        </p>
      </form>
    </>
  );
}

function CheckEmail({ email, onChange }: { email: string; onChange: () => void }) {
  const supabase = browserClient();
  const [wait, setWait] = useState(RESEND_AFTER_S);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function resend() {
    if (!supabase) return;
    setWait(RESEND_AFTER_S);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    setNote(error ? "Couldn't resend just now. Try again shortly." : `Sent again to ${email}.`);
  }

  return (
    <>
      <AuthHeading
        title="Check your email"
        lead={
          <>
            We sent a link to <strong className="font-semibold text-ink">{email}</strong>. Open it to confirm your
            account.
          </>
        }
      />
      <Button variant="secondary" size="lg" full disabled={wait > 0} onClick={() => void resend()}>
        {wait > 0 ? `Resend email in ${wait}s` : "Resend email"}
      </Button>
      <p aria-live="polite" className="-mt-1.5 min-h-5 text-center font-mono text-meta text-ink-faint">
        {note}
      </p>
      <div className="flex flex-col gap-2.5 rounded-card bg-surface-raised p-4 text-sm leading-normal text-ink-muted">
        <span>Not there? Check Spam or Promotions.</span>
        <span>
          Wrong address?{" "}
          <button type="button" onClick={onChange} className="rounded-tile font-medium text-link hover:underline">
            Change it
          </button>
        </span>
      </div>
      <p className="mt-1.5 text-center text-[0.9375rem] text-ink-muted">
        Already clicked the link? <TextLink href="/onboarding">Continue to set up</TextLink>
      </p>
    </>
  );
}
