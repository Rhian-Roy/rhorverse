"use client";

import { Gear, SignOut, UserCircle, User as UserIcon } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/controls/Button";
import { hardNavigate } from "@/lib/hard-navigate";
import { browserClient } from "@/lib/supabase/client";
import { useAuthUser, type NavUser } from "@/lib/use-auth-user";

const ITEM =
  "flex h-11 cursor-pointer items-center gap-3 rounded-tile px-3 text-[0.9375rem] text-ink outline-none select-none data-[highlighted]:bg-surface-hover";

function Avatar({ user, size }: { user: NavUser; size: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-pill bg-chip-selected font-semibold tracking-wide text-chip-selected-ink ${
        size === "sm" ? "size-9 text-meta" : "size-10 text-[0.9375rem]"
      }`}
    >
      {user.initials}
    </span>
  );
}

async function signOut() {
  await browserClient()?.auth.signOut();
  hardNavigate("/");
}

/** Right end of the nav: a Sign in pill for guests, an avatar menu once signed in. */
export function AccountMenu() {
  const { user, ready } = useAuthUser();
  const pathname = usePathname();

  if (!ready) return <span aria-hidden className="size-10" />;

  if (!user) {
    const next = pathname && pathname !== "/" ? `?${new URLSearchParams({ next: pathname })}` : "";
    return (
      <>
        <Link
          href="/profile"
          aria-label="Your taste profile"
          className="grid size-10 place-items-center rounded-pill text-ink-muted transition-colors duration-quick hover:bg-surface-overlay hover:text-ink"
        >
          <UserCircle />
        </Link>
        <Link href={`/sign-in${next}`} className={buttonClass({ variant: "secondary" })}>
          Sign in
        </Link>
      </>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Account menu for ${user.name}`}
        className="rounded-pill transition-[scale] duration-quick active:scale-95 data-[state=open]:ring-2 data-[state=open]:ring-highlight data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-surface"
      >
        <Avatar user={user} size="sm" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          aria-label="Account menu"
          className="z-60 w-70 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface-overlay p-1.5 text-ink"
        >
          <div className="flex items-center gap-3 px-3 pt-2.5 pb-3">
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-semibold">{user.name}</p>
              <p className="truncate text-meta text-ink-muted">{user.email}</p>
            </div>
          </div>
          <DropdownMenu.Separator className="mx-1.5 mb-1.5 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link href="/profile" className={ITEM}>
              <UserIcon aria-hidden className="size-5 text-ink-muted" />
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/account" className={ITEM}>
              <Gear aria-hidden className="size-5 text-ink-muted" />
              Account
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM} onSelect={() => void signOut()}>
            <SignOut aria-hidden className="size-5 text-ink-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
