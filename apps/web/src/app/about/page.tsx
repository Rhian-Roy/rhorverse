import type { Metadata } from "next";
import { CREDITS, Credit, type CreditSource } from "@/components/attribution/Credit";

export const metadata: Metadata = { title: "About & credits" };

export default function AboutPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">About Rhorverse</h1>
      <p className="max-w-2xl text-ink-muted">
        Rhorverse recommends across movies, TV, anime, music and games from one taste profile. It&apos;s a personal,
        non-commercial project. All metadata and images belong to their respective providers.
      </p>
      <section aria-labelledby="credits" className="flex flex-col gap-2">
        <h2 id="credits" className="font-display text-xl font-semibold text-ink">
          Data sources
        </h2>
        {(Object.keys(CREDITS) as CreditSource[]).map((s) => (
          <Credit key={s} source={s} />
        ))}
      </section>
    </>
  );
}
