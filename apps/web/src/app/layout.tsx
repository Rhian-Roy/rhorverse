import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MiniPlayer } from "@/components/music/MiniPlayer";
import { ToastHost } from "@/components/shell/FlashToast";
import { FocusRoot } from "@/components/shell/FocusRoot";
import { ShellFrame } from "@/components/shell/ShellFrame";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { TopNav } from "@/components/shell/TopNav";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rhorverse", template: "%s · Rhorverse" },
  description: "One taste profile, every universe: movies, TV, anime, music and games.",
  icons: { icon: "/brand/rhorverse-mark.svg" },
};

export const viewport: Viewport = { themeColor: "#0B110E", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The init script may set data-theme before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <FocusRoot>
          <a
            href="#main"
            className="sr-only z-50 rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <ShellFrame
            top={<TopNav />}
            bottom={
              <>
                <SiteFooter />
                <MiniPlayer />
              </>
            }
          >
            {children}
          </ShellFrame>
          <ToastHost />
        </FocusRoot>
      </body>
    </html>
  );
}
