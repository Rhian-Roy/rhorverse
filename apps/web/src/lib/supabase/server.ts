import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * A per-request client for Server Components, Route Handlers and Server Actions. Create a new one on
 * every request (never keep it in a module variable). Null when accounts aren't configured.
 */
export async function serverClient(): Promise<SupabaseClient | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Called from a Server Component, which can't write cookies. proxy.ts refreshes the session.
        }
      },
    },
  });
}
