import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentGate } from "@/components/onboarding/ConsentGate";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { api } from "@/lib/api";
import { serverToken, serverUser } from "@/lib/server-profile";
import { accountsEnabled } from "@/lib/supabase/config";
import type { Work } from "@/lib/types";

export const metadata: Metadata = { title: "Set up your Home" };

export default async function OnboardingPage() {
  if (!accountsEnabled()) redirect("/");
  if (!(await serverUser())) redirect("/sign-in?next=/onboarding");

  if (api.mode === "live") {
    const token = await serverToken();
    const account = token ? await api.account(token).catch(() => null) : null;
    if (account && !account.age_confirmed) return <ConsentGate />;
  }

  // Anyone's starting point: what's popular right now, one of each title.
  const home = await api.home();
  const seen = new Set<string>();
  const popular: Work[] = [...home.hero, ...home.rails.flatMap((r) => r.items)].filter(
    (w) => !seen.has(w.id) && !!seen.add(w.id),
  );
  return <Onboarding popular={popular.slice(0, 60)} />;
}
