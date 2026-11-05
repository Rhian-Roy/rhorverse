"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { color, colorLight } from "@rhorverse/tokens";
import { useEffect } from "react";
import { setTheme, useTheme } from "@/lib/use-theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "light" ? "dark" : "light";

  // Keeps the browser's own chrome (mobile address bar) in step with the page.
  useEffect(() => {
    const surface = theme === "light" ? colorLight.surface : color.surface;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", surface);
  }, [theme]);

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
      className="grid size-10 place-items-center rounded-pill text-ink-muted transition-colors duration-quick hover:bg-surface-overlay hover:text-ink"
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
