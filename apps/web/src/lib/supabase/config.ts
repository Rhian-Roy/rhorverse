/**
 * The public Supabase settings. Both values are safe for the browser. The `process.env.NEXT_PUBLIC_*`
 * reads must stay literal: Next only inlines them into client bundles when written out in full.
 * Returns null when accounts are not set up, so the app still runs in snapshot mode without them.
 */
export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export const accountsEnabled = (): boolean => supabaseConfig() !== null;
