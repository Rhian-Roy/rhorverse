"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { browserClient } from "./supabase/client";

export interface NavUser {
  id: string;
  name: string;
  email: string;
  initials: string;
}

interface Snapshot {
  user: NavUser | null;
  /** False until the first answer, so the nav can hold its space instead of flashing "Sign in". */
  ready: boolean;
}

function toNavUser(user: User | undefined | null): NavUser | null {
  if (!user) return null;
  const email = user.email ?? "";
  const name =
    String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim() || email.split("@")[0] || "You";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return { id: user.id, name, email, initials: initials || "?" };
}

const SERVER: Snapshot = { user: null, ready: false };
let snapshot: Snapshot = SERVER;
let started = false;
const listeners = new Set<() => void>();

function publish(session: Session | null) {
  snapshot = { user: toNavUser(session?.user), ready: true };
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  const supabase = browserClient();
  if (!supabase) {
    snapshot = { user: null, ready: true };
    return;
  }
  void supabase.auth.getSession().then(({ data }) => publish(data.session));
  supabase.auth.onAuthStateChange((_event, session) => publish(session));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * The signed-in user, for display (the nav). It comes from the browser's own session, so it is never
 * used for access decisions: the API and the server pages verify the token themselves.
 */
export function useAuthUser(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
}
