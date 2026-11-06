"use client";

import { useState, useSyncExternalStore } from "react";
import { Toast } from "@/components/controls/Toast";
import { FLASH_COOKIE, mergeSummary, parseMergeFlash } from "@/lib/flash";

let message: string | null | undefined; // read from the cookie once per page load

function takeMessage(): string | null {
  if (message === undefined) {
    const raw = document.cookie.match(new RegExp(`(?:^|;\\s*)${FLASH_COOKIE}=([^;]*)`))?.[1];
    if (raw) document.cookie = `${FLASH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`; // show it once only
    const merged = parseMergeFlash(raw);
    message = merged ? mergeSummary(merged) || null : null;
  }
  return message;
}

const subscribe = () => () => {};

/** Shows the one-off message /auth/callback leaves behind after folding a guest's activity into an account. */
export function FlashToast() {
  const body = useSyncExternalStore(subscribe, takeMessage, () => null);
  const [dismissed, setDismissed] = useState(false);
  if (!body || dismissed) return null;
  return (
    <Toast
      title="Your guest activity was saved to your account."
      body={body}
      action={{ label: "See ratings", href: "/profile" }}
      onDismiss={() => setDismissed(true)}
    />
  );
}
