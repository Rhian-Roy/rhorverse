"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { serverToken } from "@/lib/server-profile";

/** Records the 18+ and privacy confirmation for the signed-in user, then returns to set-up. */
export async function acceptConsent(): Promise<void> {
  const token = await serverToken();
  if (!token) redirect("/sign-in?next=/onboarding");
  await api.recordConsent(token);
  redirect("/onboarding");
}
