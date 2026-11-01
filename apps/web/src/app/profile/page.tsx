import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Your taste" };

export default function ProfilePage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">Your taste profile</h1>
      <p className="max-w-xl text-ink-muted">
        Rate a few things or{" "}
        <Link href="/import" className="text-accent hover:underline">
          import your history
        </Link>{" "}
        and your taste map shows up here across every medium.
      </p>
    </>
  );
}
