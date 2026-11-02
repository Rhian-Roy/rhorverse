// Typed client. API_MODE=live calls the FastAPI service; API_MODE=snapshot reads
// precomputed JSON from /snapshots/*.json so the web app runs with no backend.
import type { EventAck, EventIn, HomeFeed, MediaType, Rail, SearchResult, Work, WorkDetail } from "./types";

export type ApiMode = "live" | "snapshot";

export const API_MODE: ApiMode = process.env.API_MODE === "live" ? "live" : "snapshot";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function live<T>(path: string, init: RequestInit = { next: { revalidate: 300 } }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new ApiError(res.status, `${path} → ${res.status}`);
  return (await res.json()) as T;
}

async function snapshot<T>(name: string): Promise<T> {
  if (typeof window === "undefined") {
    // Server: read straight from public/ to avoid fetching ourselves.
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(join(process.cwd(), "public", "snapshots", `${name}.json`), "utf8");
    return JSON.parse(raw) as T;
  }
  const res = await fetch(`/snapshots/${name}.json`);
  if (!res.ok) throw new ApiError(res.status, `snapshot ${name} → ${res.status}`);
  return (await res.json()) as T;
}

// Route params may arrive still percent-encoded ("tmdb%3Amovie%2F603"); ids never contain "%".
function pathId(id: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(id));
  } catch {
    return encodeURIComponent(id);
  }
}

const MEDIA_SNAPSHOT: Record<MediaType, string> = {
  movie: "movies",
  tv: "shows",
  anime: "anime",
  music: "music",
  game: "games",
};

function allSnapshotWorks(feed: HomeFeed): Work[] {
  const seen = new Map<string, Work>();
  for (const w of [...feed.hero, ...feed.rails.flatMap((r) => r.items)]) seen.set(w.id, w);
  return [...seen.values()];
}

export const api = {
  mode: API_MODE,

  /** With a profile id the feed is personal, so it is never cached. */
  home(profileId?: string | null): Promise<HomeFeed> {
    if (API_MODE !== "live") return snapshot("home");
    return profileId
      ? live(`/recs/home?${new URLSearchParams({ profile_id: profileId })}`, { cache: "no-store" })
      : live("/recs/home");
  },

  async media(media: MediaType): Promise<Rail[]> {
    if (API_MODE === "live") return live(`/works?media=${media}&rails=1`);
    return snapshot<Rail[]>(MEDIA_SNAPSHOT[media]);
  },

  async work(id: string): Promise<WorkDetail | null> {
    if (API_MODE === "live") {
      try {
        return await live<WorkDetail>(`/works/${pathId(id)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    }
    const hit = allSnapshotWorks(await snapshot<HomeFeed>("home")).find((w) => w.id === id);
    return hit ? { ...hit, facets: {}, availability: [] } : null;
  },

  async search(q: string, media?: MediaType): Promise<SearchResult> {
    if (API_MODE === "live") {
      const params = new URLSearchParams({ q });
      if (media) params.set("media", media);
      return live(`/search?${params}`);
    }
    const needle = q.trim().toLowerCase();
    const items = allSnapshotWorks(await snapshot<HomeFeed>("home")).filter(
      (w) => (!media || w.media === media) && (!needle || w.title.toLowerCase().includes(needle)),
    );
    return { query: q, media: media ?? null, items };
  },

  because(id: string): Promise<Rail> {
    return live(`/recs/because/${pathId(id)}`);
  },

  /** Browser only (live mode). */
  sendEvents(events: EventIn[]): Promise<EventAck> {
    return live("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
    });
  },
};
