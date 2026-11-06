"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/shows", label: "TV" },
  { href: "/anime", label: "Anime" },
  { href: "/music", label: "Music" },
  { href: "/games", label: "Games" },
] as const;

function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Link
          href={href}
          aria-label={label}
          className="grid size-10 place-items-center rounded-pill text-ink-muted transition-colors duration-quick hover:bg-surface-overlay hover:text-ink"
        >
          {children}
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="rounded-tile bg-surface-overlay px-2 py-1 text-xs text-ink"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const [scrolled, setScrolled] = useState(false);

  // The one blur in the app, and only once content is moving under the bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-transparent bg-surface transition-colors duration-quick data-[scrolled=true]:border-line data-[scrolled=true]:bg-surface/80 data-[scrolled=true]:backdrop-blur"
    >
      <nav aria-label="Primary" className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:h-16 md:flex-nowrap md:px-6 md:py-0">
        <Link href="/" aria-label="Rhorverse home" className="shrink-0">
          <Wordmark />
        </Link>
        <ul className="scrollbar-none order-last flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive(tab.href) ? "page" : undefined}
                className="block rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink aria-[current=page]:bg-chip-selected aria-[current=page]:text-chip-selected-ink"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <IconLink href="/search" label="Search">
            <MagnifyingGlass />
          </IconLink>
          <AccountMenu />
        </div>
      </nav>
    </header>
  );
}
