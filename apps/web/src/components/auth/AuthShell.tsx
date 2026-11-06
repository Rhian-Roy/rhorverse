import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/shell/Wordmark";

// Decorative only: the real artwork lives on the browse pages. These just give the wall some texture.
const WALL: readonly (readonly [string, "poster" | "square" | "capsule"])[][] = [
  [["Dark", "poster"], ["Blonde", "square"], ["Hades", "capsule"], ["Arcane", "poster"], ["In Rainbows", "square"], ["Celeste", "capsule"]],
  [["Parasite", "poster"], ["Hollow Knight", "capsule"], ["Currents", "square"], ["Frieren", "poster"], ["Outer Wilds", "capsule"], ["Rockstar", "square"]],
  [["Spirited Away", "poster"], ["Moosetape", "square"], ["Inside", "capsule"], ["Andhadhun", "poster"], ["Punya Paap", "square"], ["Journey", "capsule"]],
  [["Interstellar", "poster"], ["Elden Ring", "capsule"], ["Random Access Memories", "square"], ["Paatal Lok", "poster"], ["Stardew Valley", "capsule"], ["Blonde", "square"]],
  [["Solo Leveling", "poster"], ["Currents", "square"], ["Hades", "capsule"], ["Dune: Part Two", "poster"], ["Rockstar", "square"], ["Celeste", "capsule"]],
];
const SHAPE = { poster: "aspect-[2/3]", square: "aspect-square", capsule: "aspect-[460/215] text-meta" } as const;

function Wall() {
  return (
    <div aria-hidden className="relative hidden min-w-0 flex-1 overflow-hidden border-r border-line lg:block">
      <div className="absolute -inset-10 grid grid-cols-5 gap-3.5 opacity-30 grayscale">
        {WALL.map((col, c) => (
          <div key={c} className={`wall-col flex flex-col gap-3.5 ${c % 2 ? "wall-col-reverse" : ""}`}>
            {[...col, ...col].map(([title, shape], i) => (
              <span
                key={i}
                className={`flex items-end overflow-hidden rounded-tile bg-brand p-2.5 font-display text-sm leading-tight font-semibold text-ink-muted ${SHAPE[shape]}`}
              >
                {title}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The split layout shared by sign in, sign up and recovery: a quiet wall on the left, the form on the right. */
export function AuthShell({
  back = { href: "/", label: "Back to browsing" },
  children,
}: {
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <Wall />
      <div className="flex w-full shrink-0 flex-col px-6 pt-8 pb-10 sm:px-12 lg:w-140 lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Rhorverse home" className="rounded-tile">
            <Wordmark />
          </Link>
          <Link href={back.href} className="rounded-tile text-sm font-medium text-link hover:underline">
            {back.label}
          </Link>
        </div>
        <main id="main" tabIndex={-1} className="my-auto flex flex-col gap-4 py-12 outline-none">
          {children}
        </main>
        <p className="text-meta text-ink-faint">
          <Link href="/privacy" className="text-link hover:underline">
            Privacy notice
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthHeading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="mb-2 flex flex-col gap-2">
      <h1 className="font-display text-3xl leading-[1.05] font-bold tracking-tight">{title}</h1>
      {lead ? <p className="text-lg leading-relaxed text-ink-muted">{lead}</p> : null}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 font-mono text-meta text-ink-faint">
      <span aria-hidden className="h-px flex-1 bg-line" />
      or with email
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-card border border-danger bg-surface-raised px-3.5 py-3 text-sm leading-snug text-ink">
      {children}
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-tile font-medium text-link hover:underline">
      {children}
    </Link>
  );
}

export function AccountsOff() {
  return (
    <FormAlert>
      Accounts aren&apos;t set up on this copy of Rhorverse yet. You can keep browsing as a guest.
    </FormAlert>
  );
}
