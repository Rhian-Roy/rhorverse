import { cookies } from "next/headers";
import { api } from "./api";
import { PROFILE_COOKIE } from "./profile";
import { serverClient } from "./supabase/server";
import type { Who } from "./who";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/** The signed-in user, verified against the project's signing keys (not just read from the cookie). */
export async function serverUser(): Promise<SessionUser | null> {
  const supabase = await serverClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as { full_name?: string };
  const email = typeof claims.email === "string" ? claims.email : "";
  return { id: claims.sub, email, name: meta.full_name?.trim() || email.split("@")[0] || "You" };
}

/** The access token to forward to the API, once the user has been verified. */
export async function serverToken(): Promise<string | null> {
  const supabase = await serverClient();
  if (!supabase || !(await serverUser())) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Who to ask the API as, in a server component: the signed-in user's token, else the guest cookie id.
 * Snapshot mode has no profiles, so it returns undefined and the page stays static.
 */
export async function serverWho(): Promise<Who | undefined> {
  if (api.mode !== "live") return undefined;
  const token = await serverToken();
  if (token) return { token };
  const guestId = (await cookies()).get(PROFILE_COOKIE)?.value;
  return guestId ? { guestId } : undefined;
}
