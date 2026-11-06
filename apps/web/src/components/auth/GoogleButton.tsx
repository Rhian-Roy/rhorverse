"use client";

import { useState } from "react";
import { Button } from "@/components/controls/Button";
import { browserClient } from "@/lib/supabase/client";

/** Starts Google sign-in. Supabase sends the user back to /auth/callback, which finishes the job. */
export function GoogleButton({
  next,
  consent = false,
  onBlocked,
}: {
  next: string;
  /** Sign-up: the 18+ and privacy boxes were ticked, so the callback may record consent. */
  consent?: boolean;
  /** Return true to stop (sign-up checks its boxes first). */
  onBlocked?: () => boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function go() {
    if (onBlocked?.()) return;
    const supabase = browserClient();
    if (!supabase) return;
    setBusy(true);
    setFailed(false);
    const params = new URLSearchParams({ next });
    if (consent) params.set("consent", "1");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?${params}` },
    });
    if (error) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <>
      <Button variant="secondary" size="lg" full disabled={busy} onClick={() => void go()}>
        Continue with Google
      </Button>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t start Google sign-in. Try again, or use your email.
        </p>
      ) : null}
    </>
  );
}
