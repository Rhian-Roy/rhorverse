import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Privacy notice" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex max-w-2xl flex-col gap-3">
      <h2 id={id} className="font-display text-title text-ink">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="font-display text-display-l text-ink">Privacy notice</h1>
        <p className="text-ink-muted">
          Rhorverse is a personal, non-commercial project. This page says what it stores about you, why, who
          handles it, and how to take it back.
        </p>
      </div>

      <Section id="guest" title="If you just browse">
        <p>
          You don&apos;t need an account. We keep a random ID in a cookie (<code>rhorverse_pid</code>) so the things you
          mark as seen, liked or not interested can shape your recommendations. It contains no personal details.
          Clearing your cookies forgets it. Your theme and TV-mode choice are kept in your browser only.
        </p>
      </Section>

      <Section id="account" title="If you create an account">
        <p>We store:</p>
        <ul className="list-disc pl-5">
          <li>your name and email address, or the name and email Google shares when you use Continue with Google;</li>
          <li>your password, as a salted hash. We never see or store the password itself;</li>
          <li>
            your taste: the titles you marked seen, liked, saved or not interested, a summary vector built from them,
            and a record of each import (source, date, counts). The files you upload for an import are read and
            discarded, not kept;
          </li>
          <li>that you confirmed you are 18 or older and read this notice, and when.</li>
        </ul>
        <p>
          We use it to sign you in, to recommend things, and to keep your history across devices. We don&apos;t sell it,
          show ads, or share it with anyone except the services below.
        </p>
        <p>
          Signing in sets cookies from <code>sb-</code> that keep you signed in. They are needed for the account to work.
        </p>
      </Section>

      <Section id="who" title="Who handles it">
        <ul className="list-disc pl-5">
          <li>Supabase hosts sign-in and the database (Mumbai, India).</li>
          <li>Vercel hosts the website and the recommendation API (Mumbai, India).</li>
          <li>Google, only if you choose Continue with Google.</li>
        </ul>
        <p>
          Titles, posters and availability come from TMDB, JustWatch, AniList, RAWG and Apple. Nothing about you is sent
          to them.
        </p>
      </Section>

      <Section id="control" title="Your control">
        <ul className="list-disc pl-5">
          <li>
            <strong className="text-ink">See it:</strong> Account › Privacy and data › Export my data downloads
            everything we hold as a JSON file.
          </li>
          <li>
            <strong className="text-ink">Delete it:</strong> Account › Privacy and data › Delete account removes your
            profile, events, imports and sign-in for good. It can&apos;t be undone.
          </li>
          <li>
            <strong className="text-ink">Guests:</strong> clear the <code>rhorverse_pid</code> cookie. The guest profile
            is then unreachable.
          </li>
        </ul>
        <p>
          Rhorverse is for people aged 18 and over. Questions or requests: message{" "}
          <a href="https://github.com/Rhian-Roy" className="text-link hover:underline">
            Rhian Roy on GitHub
          </a>
          .
        </p>
      </Section>

      <p className="text-sm text-ink-faint">
        <Link href="/about" className="hover:underline">
          Data sources and credits
        </Link>
      </p>
    </>
  );
}
