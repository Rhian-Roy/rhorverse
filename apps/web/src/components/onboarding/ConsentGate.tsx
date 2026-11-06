"use client";

import { useState } from "react";
import { Button } from "@/components/controls/Button";
import { Checkbox } from "@/components/controls/Checkbox";
import { AuthHeading, AuthShell, FormAlert, TextLink } from "@/components/auth/AuthShell";
import { acceptConsent } from "@/app/onboarding/actions";

/** Shown once to people who joined with Google, who never saw the sign-up form's two confirmations. */
export function ConsentGate() {
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    setBusy(true);
    setFailed(false);
    try {
      await acceptConsent(); // redirects on success
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <AuthHeading title="One last thing" lead="Before we set up your account, we need two confirmations." />
      {failed ? <FormAlert>Couldn&apos;t save that. Please try again.</FormAlert> : null}
      <Checkbox label="I’m 18 or older" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
      <Checkbox
        label={
          <>
            I’ve read the <TextLink href="/privacy">Privacy notice</TextLink>, which explains what we store and how to
            delete it
          </>
        }
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
      />
      <Button size="lg" full disabled={!adult || !consent || busy} onClick={() => void submit()}>
        {busy ? "Saving…" : "Continue"}
      </Button>
    </AuthShell>
  );
}
