import Link from "next/link";
import { Wordmark } from "@/components/shell/Wordmark";

const STEPS = ["Favourites", "Import history", "Your first rails"] as const;

/** Wordmark, "Step n of 3", a three-part progress bar, and a way out. Used by every set-up screen. */
export function OnboardHeader({ step }: { step: 1 | 2 | 3 }) {
  return (
    <header className="flex min-h-18 items-center gap-4 border-b border-line px-6 py-3 md:gap-8 md:px-10">
      <Link href="/" aria-label="Rhorverse home" className="rounded-tile">
        <Wordmark />
      </Link>
      <div className="flex flex-1 flex-col items-center gap-2">
        <span className="font-mono text-meta text-ink-muted">
          Step {step} of 3 · {STEPS[step - 1]}
        </span>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          className="grid grid-cols-3 gap-1.5"
        >
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 w-10 rounded-pill sm:w-18 ${n <= step ? "bg-ink" : "bg-surface-hover"}`} />
          ))}
        </div>
      </div>
      <Link href="/" className="rounded-tile text-sm font-medium text-link hover:underline">
        Skip setup
      </Link>
    </header>
  );
}
