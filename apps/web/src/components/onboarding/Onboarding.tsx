"use client";

import { Check } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChipBar } from "@/components/chips/ChipBar";
import { Button, buttonClass } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { ImportCard } from "@/components/import/ImportCard";
import { Rail } from "@/components/rail/Rail";
import { imageFor, MEDIA_SHAPE } from "@/components/rail/Tile";
import { api } from "@/lib/api";
import { currentWho } from "@/lib/client-who";
import type { HomeFeed, ImportSource, MediaType, Work } from "@/lib/types";
import Link from "next/link";
import { OnboardHeader } from "./OnboardHeader";

const MIN_PICKS = 5;
const MEDIA_CHIPS: { value: MediaType; label: string }[] = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "anime", label: "Anime" },
  { value: "music", label: "Music" },
  { value: "game", label: "Games" },
];
const SHAPE_CLASS = { poster: "aspect-[2/3]", square: "aspect-square", capsule: "aspect-[460/215]", landscape: "aspect-video" };
const IMPORTS: ImportSource[] = ["netflix", "letterboxd", "anilist", "steam"];

const FOOTER = "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised";

export function Onboarding({ popular }: { popular: Work[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [picked, setPicked] = useState<Map<string, Work>>(new Map());

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <OnboardHeader step={step} />
      {step === 1 ? (
        <Picks popular={popular} picked={picked} setPicked={setPicked} onNext={() => setStep(2)} />
      ) : step === 2 ? (
        <ImportStep onBack={() => setStep(1)} onNext={() => setStep(3)} />
      ) : (
        <FirstRails picks={picked.size} onBack={() => setStep(2)} />
      )}
    </div>
  );
}

// --- 1 · favourites ------------------------------------------------------------------------------

function Picks({
  popular,
  picked,
  setPicked,
  onNext,
}: {
  popular: Work[];
  picked: Map<string, Work>;
  setPicked: (next: Map<string, Work>) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState<MediaType | null>(null);
  const [found, setFound] = useState<{ key: string; items: Work[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const q = query.trim();
  const key = `${q}|${medium ?? ""}`;
  useEffect(() => {
    if (!q) return;
    const timer = setTimeout(() => {
      api
        .search(q, medium ?? undefined)
        .then((r) => setFound({ key, items: r.items }))
        .catch(() => setFound({ key, items: [] }));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, medium, key]);

  const searching = q.length > 0;
  const loading = searching && found?.key !== key;
  const items = searching ? (found?.key === key ? found.items : []) : popular.filter((w) => !medium || w.media === medium);
  const names = [...picked.values()].map((w) => w.title).join(", ");

  function toggle(work: Work) {
    const next = new Map(picked);
    if (!next.delete(work.id)) next.set(work.id, work);
    setPicked(next);
  }

  async function next() {
    setSaveError(false);
    if (api.mode !== "live") return onNext(); // snapshot mode has nowhere to save them
    setSaving(true);
    try {
      await api.sendEvents(
        [...picked.keys()].map((work_id) => ({ work_id, kind: "like" as const, weight: 1 })),
        await currentWho(),
      );
      onNext();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <main id="main" tabIndex={-1} className="mx-auto flex max-w-310 flex-col gap-6 px-6 pt-12 pb-40 outline-none md:px-10">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-display-l tracking-tight text-ink">Pick at least {MIN_PICKS} favourites</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
            Mix movies, TV, anime, music and games. Your first rails are built from these, so a mix gives you a better
            Home.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-5">
          <Field
            label="Search titles, albums or games"
            type="search"
            placeholder="Try Panchayat, Frieren or Celeste"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-64 max-w-140 flex-1 basis-105"
          />
          <ChipBar label="Medium" chips={MEDIA_CHIPS} value={medium} onChange={setMedium} />
        </div>

        {loading ? (
          <p role="status" className="text-ink-muted">
            Searching…
          </p>
        ) : items.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.375rem,1fr))] items-start gap-x-5 gap-y-7 pt-2">
            {items.map((work) => {
              const on = picked.has(work.id);
              const shape = MEDIA_SHAPE[work.media];
              const src = imageFor(work, shape);
              return (
                <li key={work.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={work.title}
                    onClick={() => toggle(work)}
                    className="group flex w-full flex-col gap-2 rounded-tile text-left outline-none"
                  >
                    <span
                      className={`relative block ${SHAPE_CLASS[shape]} overflow-hidden rounded-tile bg-surface-overlay outline-2 outline-offset-3 transition-[scale,outline-color] duration-quick ease-enter group-hover:scale-[1.03] group-focus-visible:outline-focus ${on ? "outline-highlight" : "outline-transparent"}`}
                    >
                      {src ? (
                        <Image src={src} alt="" fill sizes="150px" className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-end p-2.5 font-display text-sm font-semibold text-ink-muted">
                          {work.title}
                        </span>
                      )}
                      {on ? (
                        <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-pill bg-chip-selected text-chip-selected-ink">
                          <Check aria-hidden />
                        </span>
                      ) : null}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="line-clamp-1 text-sm leading-snug text-ink">{work.title}</span>
                      <span className="font-mono text-meta text-ink-faint">
                        {[MEDIA_CHIPS.find((c) => c.value === work.media)?.label, work.year].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div role="status" className="flex max-w-md flex-col gap-1.5 py-8">
            <p className="font-display text-title text-ink">
              {searching ? `No matches for “${q}”` : "Nothing to show here yet"}
            </p>
            <p className="text-ink-muted">
              Try the English or original title, or clear the medium filter. Everything you pick stays picked.
            </p>
          </div>
        )}
      </main>
      <div className={FOOTER}>
        <div className="mx-auto flex max-w-310 items-center gap-5 px-6 py-4 md:px-10">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span aria-live="polite" className="text-base font-semibold">
              {picked.size >= MIN_PICKS
                ? `${picked.size} picked. You can add more.`
                : `${picked.size} of ${MIN_PICKS} picked`}
            </span>
            <span className="truncate text-meta text-ink-muted">{saveError ? "Couldn't save your picks. Try again." : names}</span>
          </div>
          <Button size="lg" disabled={picked.size < MIN_PICKS || saving} onClick={() => void next()}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </>
  );
}

// --- 2 · import history -------------------------------------------------------------------------------

function ImportStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <>
      <main id="main" tabIndex={-1} className="mx-auto flex max-w-260 flex-col gap-8 px-6 pt-12 pb-40 outline-none md:px-10">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-display-l tracking-tight text-ink">Bring your history</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
            Optional. Every import marks things as seen or played, so we stop suggesting them and learn faster. We only
            read titles, dates and ratings.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {IMPORTS.map((s) => (
            <ImportCard key={s} source={s} />
          ))}
        </div>
        <p className="text-sm leading-normal text-ink-faint">
          You can add more later from Import in the menu.
        </p>
      </main>
      <div className={FOOTER}>
        <div className="mx-auto flex max-w-260 items-center gap-4 px-6 py-4 md:px-10">
          <Button variant="ghost" size="lg" onClick={onBack}>
            Back
          </Button>
          <span className="flex-1" />
          <Button size="lg" onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    </>
  );
}

// --- 3 · first rails ------------------------------------------------------------------------------------

function FirstRails({ picks, onBack }: { picks: number; onBack: () => void }) {
  const [feed, setFeed] = useState<HomeFeed | null>(null);

  useEffect(() => {
    let live = true;
    void currentWho()
      .then((who) => api.home(who))
      .then((f) => live && setFeed(f))
      .catch(() => live && setFeed({ hero: [], rails: [] }));
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <main id="main" tabIndex={-1} className="flex flex-col gap-6 px-6 pt-12 pb-40 outline-none md:px-10">
        <div className="flex max-w-3xl flex-col gap-2.5">
          <h1 className="font-display text-display-l tracking-tight text-ink">Here’s your Home, to start</h1>
          <p className="text-lg leading-relaxed text-ink-muted">
            {picks > 0 ? `Built from your ${picks} picks and anything you imported. ` : "Built from what you imported. "}
            Rate things as you go and these rails sharpen.
          </p>
        </div>
        {feed === null ? (
          <p role="status" className="text-ink-muted">
            Building your rails…
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {feed.rails.slice(0, 4).map((rail) => (
              <Rail key={rail.id} rail={rail} />
            ))}
          </div>
        )}
      </main>
      <div className={FOOTER}>
        <div className="flex items-center gap-4 px-6 py-4 md:px-10">
          <Button variant="ghost" size="lg" onClick={onBack}>
            Back
          </Button>
          <span className="flex-1" />
          <Link href="/" className={buttonClass({ size: "lg" })}>
            Done
          </Link>
        </div>
      </div>
    </>
  );
}
