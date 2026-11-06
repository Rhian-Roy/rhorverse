"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { serverToken, serverUser } from "@/lib/server-profile";
import { adminClient } from "@/lib/supabase/admin";
import { serverClient } from "@/lib/supabase/server";

export type DeleteResult = { ok: false; error: string };

/**
 * Deletes the signed-in user: their profile, events and imports through the API, then the sign-in
 * itself through the admin API. The secret key lives only here, on the server. Who is asking comes
 * from the verified session, never from the request.
 */
export async function deleteAccount(): Promise<DeleteResult> {
  const user = await serverUser();
  const token = await serverToken();
  if (!user || !token) redirect("/sign-in?next=/account");

  try {
    if (api.mode === "live") await api.deleteAccountData(token); // idempotent, so a retry after a failure is safe
    const { error } = await adminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (e) {
    console.error(`[account] delete failed: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, error: "We couldn't finish deleting your account. Nothing else changes: try again in a moment." };
  }

  try {
    await (await serverClient())?.auth.signOut({ scope: "local" }); // clears the cookies
  } catch {
    // The user is already gone, so the call may 401; the cookies were cleared either way.
  }
  redirect("/");
}
