import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16 renamed middleware to proxy. This only keeps the Supabase session fresh; it never redirects.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|snapshots|brand|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)"],
};
