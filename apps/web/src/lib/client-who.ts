"use client";

import { ensureProfileId } from "./profile";
import { browserClient } from "./supabase/client";
import type { Who } from "./who";

/** Browser only: the signed-in user's token if there is a session, else the guest cookie id. */
export async function currentWho(): Promise<Who> {
  const supabase = browserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return { token: data.session.access_token };
  }
  return { guestId: ensureProfileId() };
}
