import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/account/PasswordForm";
import { PrivacyActions, SignOutEverywhere } from "@/components/account/DangerZone";
import { ProfileForm } from "@/components/account/ProfileForm";
import { api } from "@/lib/api";
import { serverToken, serverUser } from "@/lib/server-profile";
import type { ImportSource } from "@/lib/types";

export const metadata: Metadata = { title: "Account" };

// Depends on who is signed in, so it is rendered per request.
export const dynamic = "force-dynamic";

const SOURCE_NAME: Record<ImportSource, string> = { netflix: "Netflix", letterboxd: "Letterboxd", anilist: "AniList", steam: "Steam" };

interface ImportRow {
  source: ImportSource;
  status: string;
  matched: number;
  unmatched: number;
  error: string | null;
  created_at: string;
}

async function loadImports(token: string | null): Promise<ImportRow[]> {
  if (!token || api.mode !== "live") return [];
  try {
    const data = (await api.exportData({ token })) as { imports?: ImportRow[] };
    return data.imports ?? [];
  } catch {
    return [];
  }
}

const SECTIONS = [
  ["profile", "Profile"],
  ["password", "Password"],
  ["imports", "Connected imports"],
  ["privacy", "Privacy and data"],
  ["devices", "Devices"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`h-${id}`} className="flex scroll-mt-24 flex-col gap-5">
      <h2 id={`h-${id}`} className="font-display text-title text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const user = await serverUser();
  if (!user) redirect("/sign-in?next=/account");
  const imports = await loadImports(await serverToken());

  return (
    <div className="mx-auto flex w-full max-w-280 flex-wrap items-start gap-14 py-4">
      <nav aria-label="Account sections" className="flex flex-[0_0_13.75rem] flex-col">
        <h1 className="mb-5 font-display text-3xl leading-[1.05] font-bold tracking-tight text-ink">Account</h1>
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-tile px-3 py-2.5 text-[0.9375rem] text-ink-muted hover:bg-surface-hover hover:text-ink">
            {label}
          </a>
        ))}
      </nav>
      <div className="flex min-w-0 flex-[999_1_35rem] flex-col gap-16">
        <Section id="profile" title="Profile">
          <ProfileForm name={user.name} email={user.email} />
        </Section>
        <Section id="password" title="Password">
          <PasswordForm />
        </Section>
        <Section id="imports" title="Connected imports">
          {imports.length === 0 ? (
            <p className="max-w-xl text-ink-muted">
              Nothing imported yet.{" "}
              <Link href="/import" className="text-link hover:underline">
                Import your history
              </Link>{" "}
              to stop seeing things you&apos;ve already watched or played.
            </p>
          ) : (
            <ul className="flex flex-col">
              {imports.map((row) => (
                <li key={row.created_at + row.source} className="flex items-center gap-4 border-t border-line py-3.5 last:border-b">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-tile bg-surface-overlay font-display font-semibold">
                    {SOURCE_NAME[row.source][0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] font-medium">{SOURCE_NAME[row.source]}</p>
                    <p className={`font-mono text-meta ${row.status === "failed" ? "text-danger" : "text-ink-muted"}`}>
                      {row.status === "failed"
                        ? (row.error ?? "Couldn't import")
                        : `${row.matched} matched · ${row.unmatched} not found · ${new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/import" className="w-fit text-sm text-link hover:underline">
            Add or refresh an import
          </Link>
        </Section>
        <Section id="privacy" title="Privacy and data">
          <PrivacyActions />
        </Section>
        <Section id="devices" title="Devices">
          <SignOutEverywhere />
        </Section>
      </div>
    </div>
  );
}
