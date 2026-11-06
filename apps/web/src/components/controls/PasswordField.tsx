"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState, type ComponentProps } from "react";
import { passwordScore, SCORE_LABEL } from "@/lib/password";
import { Field } from "./Field";

const BAR = ["", "bg-danger", "bg-rank", "bg-highlight", "bg-success"] as const;

type Props = Omit<ComponentProps<typeof Field>, "type" | "trailing"> & { showMeter?: boolean };

/** A password input with a show/hide button and, optionally, a strength meter. */
export function PasswordField({ showMeter = false, value, ...field }: Props) {
  const [shown, setShown] = useState(false);
  const score = passwordScore(typeof value === "string" ? value : "");
  return (
    <div className="flex flex-col gap-2.5">
      <Field
        {...field}
        value={value}
        type={shown ? "text" : "password"}
        trailing={
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="grid size-9 place-items-center rounded-tile text-ink-muted hover:bg-surface-overlay hover:text-ink"
          >
            {shown ? <EyeSlash aria-hidden /> : <Eye aria-hidden />}
          </button>
        }
      />
      {showMeter && score > 0 ? (
        <div className="flex flex-col gap-2">
          <div aria-hidden className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={`h-1 rounded-pill ${n <= score ? BAR[score] : "bg-surface-hover"}`} />
            ))}
          </div>
          <p aria-live="polite" className="text-meta text-ink-muted">
            Strength: <strong className="font-semibold text-ink">{SCORE_LABEL[score]}</strong>
          </p>
        </div>
      ) : null}
    </div>
  );
}
