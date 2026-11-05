import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MiniPlayer } from "@/components/music/MiniPlayer";
import { FocusRoot } from "@/components/shell/FocusRoot";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { TopNav } from "@/components/shell/TopNav";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rhorverse", template: "%s · Rhorverse" },
  description: "One taste profile, every universe: movies, TV, anime, music and games.",
  icons: { icon: "/brand/rhorverse-mark.svg" },
};

export const viewport: Viewport = { themeColor: "#0B110E", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh">
        <FocusRoot>
          <TopNav />
          <main className="mx-auto flex max-w-screen-2xl flex-col gap-10 px-6 py-8">{children}</main>
          <SiteFooter />
          <MiniPlayer />
        </FocusRoot>
      </body>
    </html>
  );
}
