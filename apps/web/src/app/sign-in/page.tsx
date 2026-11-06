import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";
import { safeNext } from "@/lib/safe-next";
import { serverUser } from "@/lib/server-profile";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await serverUser()) redirect(next);
  return (
    <AuthShell>
      <AuthHeading title="Sign in" lead="Your ratings, lists and imports on every screen." />
      <SignInForm next={next} initialError={typeof q.error === "string" ? q.error : undefined} />
    </AuthShell>
  );
}
