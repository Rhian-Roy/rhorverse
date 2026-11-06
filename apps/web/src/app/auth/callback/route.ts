import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { api, API_MODE } from "@/lib/api";
import { FLASH_COOKIE, mergeFlash } from "@/lib/flash";
import { PROFILE_COOKIE } from "@/lib/profile";
import { safeNext } from "@/lib/safe-next";
import { serverClient } from "@/lib/supabase/server";
import { serverToken, serverUser } from "@/lib/server-profile";

/**
 * Where every sign-in lands: the OAuth redirect (?code), an emailed link (?code, or ?token_hash for
 * links opened on another device), and our own password form (no params, the session is already set).
 * It finishes the job on the server: confirm the session, fold a guest's activity into the account,
 * then go on to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/sign-in?${new URLSearchParams({ error: reason, next })}`);

  const supabase = await serverClient();
  if (!supabase) return NextResponse.redirect(`${origin}/sign-in`);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("link");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail("link");
  }

  if (!(await serverUser())) return fail("session");
  const token = await serverToken();

  let destination = next;
  let flash: string | null = null;
  let clearGuest = false;

  // A password-recovery link only needs the session; the rest happens on the next normal sign-in.
  if (token && API_MODE === "live" && !next.startsWith("/reset-password")) {
    try {
      let account = await api.account(token);
      if (!account.age_confirmed && searchParams.get("consent") === "1") {
        account = await api.recordConsent(token); // Google sign-up: the boxes were ticked first
      }
      if (!account.age_confirmed) destination = "/onboarding"; // asks for the 18+ and privacy confirmation

      const guestId = request.cookies.get(PROFILE_COOKIE)?.value;
      if (guestId) {
        const merged = await api.mergeGuest(token, guestId);
        clearGuest = true;
        if (merged.events + merged.imports > 0) flash = mergeFlash(merged);
      }
    } catch (e) {
      // Signing in must not fail because the API is asleep. The guest cookie stays, so the merge
      // runs on the next sign-in.
      console.warn(`[auth] post-sign-in step failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  if (clearGuest) response.cookies.set(PROFILE_COOKIE, "", { path: "/", maxAge: 0 });
  if (flash) response.cookies.set(FLASH_COOKIE, flash, { path: "/", maxAge: 120, sameSite: "lax" });
  return response;
}
