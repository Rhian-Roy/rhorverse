"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/controls/Button";
import { Field } from "@/components/controls/Field";
import { browserClient } from "@/lib/supabase/client";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [value, setValue] = useState(name);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const initials =
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const supabase = browserClient();
    if (!supabase || !value.trim()) return;
    setState("busy");
    const { error } = await supabase.auth.updateUser({ data: { full_name: value.trim() } });
    setState(error ? "error" : "saved");
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-110 flex-col gap-5">
      <div className="flex items-center gap-5">
        <span
          aria-hidden
          className="grid size-22 shrink-0 place-items-center rounded-pill bg-chip-selected font-display text-3xl font-semibold text-chip-selected-ink"
        >
          {initials}
        </span>
        <p className="text-sm text-ink-faint">Your initials show in the account menu.</p>
      </div>
      <Field
        label="Name"
        autoComplete="name"
        value={value}
        error={value.trim() ? undefined : "Add your name so we know what to call you."}
        onChange={(e) => {
          setValue(e.target.value);
          setState("idle");
        }}
      />
      <Field
        label="Email"
        value={email}
        disabled
        readOnly
        hint="This is the address you sign in with. To change it, contact us from the Privacy notice."
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={!value.trim() || value.trim() === name || state === "busy"}>
          {state === "busy" ? "Saving…" : "Save profile"}
        </Button>
        <span role="status" className={`text-sm ${state === "error" ? "text-danger" : "text-ink-muted"}`}>
          {state === "saved" ? "Saved." : state === "error" ? "Couldn't save. Try again." : ""}
        </span>
      </div>
    </form>
  );
}
