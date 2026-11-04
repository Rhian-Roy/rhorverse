// Typed client. API_MODE=live calls the FastAPI service; API_MODE=snapshot reads
// precomputed JSON from /snapshots/*.json so the web app runs with no backend.
import type {
  EventAck,
  EventIn,
  HomeFeed,
  ImportResult,
  ImportSource,
  MediaType,
  Rail,
  SearchResult,
  Track,
  Work,
  WorkDetail,
} from "./types";

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

// Page reads give up after this and fall back to snapshot data (a free-tier API may be cold).
const PAGE_TIMEOUT_MS = 8_000;

async function live<T>(
  path: string,
  init: RequestInit = { next: { revalidate: 300 } },
  timeoutMs?: number,
): Promise<T> {
  const signal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
  const res = await fetch(`${API_BASE}${path}`, { ...init, signal });
  if (!res.ok) throw new ApiError(res.status, `${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Live data, or the snapshot when the API times out, is unreachable or errors (404 still counts). */
async function liveOr<T>(read: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw e;
    console.warn(`[api] falling back to snapshot: ${e instanceof Error ? e.message : String(e)}`);
    return fallback();
  }
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
function rawId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function pathId(id: string): string {
  return encodeURIComponent(rawId(id));
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

async function snapshotWork(id: string): Promise<WorkDetail | null> {
  const want = rawId(id);
  const hit = allSnapshotWorks(await snapshot<HomeFeed>("home")).find((w) => w.id === want);
  return hit ? { ...hit, facets: {}, availability: [] } : null;
}

async function snapshotSearch(q: string, media?: MediaType): Promise<SearchResult> {
  const needle = q.trim().toLowerCase();
  const items = allSnapshotWorks(await snapshot<HomeFeed>("home")).filter(
    (w) => (!media || w.media === media) && (!needle || w.title.toLowerCase().includes(needle)),
  );
  return { query: q, media: media ?? null, items };
}

export const api = {
  mode: API_MODE,

  /** With a profile id the feed is personal, so it is never cached. */
  home(profileId?: string | null): Promise<HomeFeed> {
    if (API_MODE !== "live") return snapshot("home");
    const path = profileId ? `/recs/home?${new URLSearchParams({ profile_id: profileId })}` : "/recs/home";
    const init: RequestInit = profileId ? { cache: "no-store" } : { next: { revalidate: 300 } };
    return liveOr(
      () => live<HomeFeed>(path, init, PAGE_TIMEOUT_MS),
      () => snapshot("home"),
    );
  },

  /** A media tab's rails. With a profile id they're personal, so never cached. */
  async media(media: MediaType, profileId?: string | null): Promise<Rail[]> {
    const fromSnapshot = () => snapshot<Rail[]>(MEDIA_SNAPSHOT[media]);
    if (API_MODE !== "live") return fromSnapshot();
    const query = profileId ? `?${new URLSearchParams({ profile_id: profileId })}` : "";
    const init: RequestInit = profileId ? { cache: "no-store" } : { next: { revalidate: 300 } };
    return liveOr(() => live<Rail[]>(`/recs/media/${media}${query}`, init, PAGE_TIMEOUT_MS), fromSnapshot);
  },

  async work(id: string): Promise<WorkDetail | null> {
    if (API_MODE !== "live") return snapshotWork(id);
    try {
      return await liveOr(
        () => live<WorkDetail>(`/works/${pathId(id)}`, undefined, PAGE_TIMEOUT_MS),
        () => snapshotWork(id),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  async search(q: string, media?: MediaType): Promise<SearchResult> {
    if (API_MODE !== "live") return snapshotSearch(q, media);
    const params = new URLSearchParams({ q });
    if (media) params.set("media", media);
    return liveOr(
      () => live<SearchResult>(`/search?${params}`, undefined, PAGE_TIMEOUT_MS),
      () => snapshotSearch(q, media),
    );
  },

  /** Album tracks with fresh 30-s previews (live only; snapshot mode has none). */
  async tracks(id: string): Promise<Track[]> {
    if (API_MODE !== "live") return [];
    try {
      return await live<Track[]>(`/works/${pathId(id)}/tracks`, { next: { revalidate: 3600 } });
    } catch {
      return []; // a missing track list shouldn't break the album page
    }
  },

  because(id: string): Promise<Rail> {
    return live(`/recs/because/${pathId(id)}`);
  },

  /** Browser only (live mode). The CSV goes as the raw body; matching may take a while. */
  importCsv(source: ImportSource, profileId: string, csv: string): Promise<ImportResult> {
    return live(`/imports/${source}?${new URLSearchParams({ profile_id: profileId })}`, {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csv,
    });
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
