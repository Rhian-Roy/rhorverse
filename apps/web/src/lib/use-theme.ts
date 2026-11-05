"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "./theme";

const CHANGE_EVENT = "rhorverse:theme";

function read(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode etc.: the theme still applies for this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
