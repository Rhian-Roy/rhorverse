import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { safeNext } from "@/lib/safe-next";
import { serverUser } from "@/lib/server-profile";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const next = safeNext((await searchParams).next, "/onboarding");
  if (await serverUser()) redirect(next);
  return (
    <AuthShell>
      <SignUpForm next={next} />
    </AuthShell>
  );
}
