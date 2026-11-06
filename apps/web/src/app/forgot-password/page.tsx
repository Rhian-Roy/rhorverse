import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Forgot your password?" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell back={{ href: "/sign-in", label: "Back to sign in" }}>
      <AuthHeading
        title="Forgot your password?"
        lead="Enter the email you signed up with. We’ll send a link to choose a new one."
      />
      <ForgotForm />
    </AuthShell>
  );
}
