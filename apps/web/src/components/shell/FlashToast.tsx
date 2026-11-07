"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Toast } from "@/components/controls/Toast";
import { FLASH_COOKIE, mergeSummary, parseMergeFlash } from "@/lib/flash";
import { TOAST_EVENT, type ToastMessage } from "@/lib/toast";

let flash: ToastMessage | null | undefined; // read from the cookie once per page load

function takeFlash(): ToastMessage | null {
  if (flash === undefined) {
    const raw = document.cookie.match(new RegExp(`(?:^|;\\s*)${FLASH_COOKIE}=([^;]*)`))?.[1];
    if (raw) document.cookie = `${FLASH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`; // show it once only
    const merged = parseMergeFlash(raw);
    const body = merged ? mergeSummary(merged) : "";
    flash = body
      ? {
          title: "Your guest activity was saved to your account.",
          body,
          action: { label: "See ratings", href: "/profile" },
        }
      : null;
  }
  return flash;
}

const subscribe = () => () => {};

/**
 * The one place toasts appear. It shows the message /auth/callback leaves behind after folding a guest's
 * activity into an account, and anything sent with `announce()` (Seen it on a tile, say).
 */
export function ToastHost() {
  const fromCookie = useSyncExternalStore(subscribe, takeFlash, () => null);
  const [sent, setSent] = useState<{ id: number; message: ToastMessage } | null>(null);
  const [dismissedCookie, setDismissedCookie] = useState(false);

  useEffect(() => {
    let id = 0;
    const onToast = (e: Event) => setSent({ id: ++id, message: (e as CustomEvent<ToastMessage>).detail });
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  const message = sent?.message ?? (dismissedCookie ? null : fromCookie);
  if (!message) return null;
  return (
    <Toast
      key={sent?.id ?? "flash"}
      title={message.title}
      body={message.body}
      action={message.action}
      onDismiss={() => (sent ? setSent(null) : setDismissedCookie(true))}
    />
  );
}
