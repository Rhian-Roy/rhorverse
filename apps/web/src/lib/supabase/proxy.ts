import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./config";

/**
 * Refreshes the Supabase session cookies. Server Components can't write cookies, so this runs first:
 * `getClaims()` refreshes an expiring token and the new cookies go to both the page and the browser.
 * Guests (no `sb-` cookie) skip it, so anonymous browsing costs nothing extra.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  if (!config || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  // Nothing may run between createServerClient and getClaims: it is what keeps people signed in.
  await supabase.auth.getClaims();
  return response;
}
