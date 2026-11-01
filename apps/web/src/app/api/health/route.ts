import { API_MODE } from "@/lib/api";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "web", mode: API_MODE });
}
