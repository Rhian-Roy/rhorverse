import type { Metadata } from "next";
import { AuthHeading, AuthShell, TextLink } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";
import { serverUser } from "@/lib/server-profile";

export const metadata: Metadata = { title: "Choose a new password" };

// Depends on who is signed in, so it is rendered per request.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  // The emailed link signs the person in (via /auth/callback); without that session there is nothing to reset.
  const user = await serverUser();
  return (
    <AuthShell back={{ href: "/sign-in", label: "Back to sign in" }}>
      {user ? (
        <>
          <AuthHeading title="Choose a new password" />
          <ResetForm email={user.email} />
        </>
      ) : (
        <>
          <AuthHeading
            title="This link has expired"
            lead="Reset links work once and for a short time. Ask for a new one and use it straight away."
          />
          <TextLink href="/forgot-password">Send me a new link</TextLink>
        </>
      )}
    </AuthShell>
  );
}
