"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Full-screen flows with their own header and no site chrome: sign in, sign up, recovery, set-up.
const BARE = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/onboarding"];

/** The site chrome (nav, footer, player) around a page, except on the full-screen account flows. */
export function ShellFrame({ top, bottom, children }: { top: ReactNode; bottom: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (BARE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return <>{children}</>;
  return (
    <>
      {top}
      <main id="main" tabIndex={-1} className="flex flex-col gap-10 px-(--gutter) py-8 outline-none">
        {children}
      </main>
      {bottom}
    </>
  );
}
