"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/** The browser client (it keeps one instance per page). Null when accounts aren't configured. */
export function browserClient(): SupabaseClient | null {
  const config = supabaseConfig();
  return config ? createBrowserClient(config.url, config.key) : null;
}
