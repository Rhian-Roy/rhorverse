"use client";

import { MagnifyingGlass, UserCircle } from "@phosphor-icons/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-surface/80 backdrop-blur">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-screen-2xl items-center gap-6 px-6">
        <Link href="/" aria-label="Rhorverse home" className="shrink-0">
          <Wordmark />
        </Link>
        <ul className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive(tab.href) ? "page" : undefined}
                className="block rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-surface"
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <IconLink href="/search" label="Search">
            <MagnifyingGlass />
          </IconLink>
          <IconLink href="/profile" label="Your taste profile">
            <UserCircle />
          </IconLink>
        </div>
      </nav>
    </header>
  );
}
