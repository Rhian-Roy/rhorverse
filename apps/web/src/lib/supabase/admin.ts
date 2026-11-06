import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * The service client, for admin calls such as deleting a user. It holds the secret key, which must
 * never reach the browser: this file is server-only (importing it from a Client Component fails the
 * build) and the variable has no NEXT_PUBLIC_ prefix. Use it only after checking who is asking.
 */
export function adminClient(): SupabaseClient {
  const url = supabaseConfig()?.url;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
