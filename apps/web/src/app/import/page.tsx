import type { Metadata } from "next";
import { ImportCard } from "@/components/import/ImportCard";
import type { ImportSource } from "@/lib/types";

export const metadata: Metadata = { title: "Import" };

const SOURCES: ImportSource[] = ["netflix", "letterboxd", "anilist", "steam"];

export default function ImportPage() {
  return (
    <>
      <h1 className="font-display text-display-l text-ink">Bring your history</h1>
      <p className="max-w-xl text-ink-muted">
        Imports never leave this app. Items you&apos;ve already seen are excluded from recommendations.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map((s) => (
          <ImportCard key={s} source={s} />
        ))}
      </div>
    </>
  );
}
