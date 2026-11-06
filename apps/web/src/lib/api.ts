// Typed client. API_MODE=live calls the FastAPI service; API_MODE=snapshot reads
// precomputed JSON from /snapshots/*.json so the web app runs with no backend.
import { isPersonal, type Who } from "./who";
import type {
  AccountInfo,
  EventAck,
  EventIn,
  Explanation,
  HomeFeed,
  ImportResult,
  ImportSource,
  MediaFeed,
  MergeResult,
  MediaType,
  Rail,
  SearchFilters,
  SearchResult,
  TasteProfile,
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

const NO_STORE: RequestInit = { cache: "no-store" };

/**
 * How to identify the caller. A token goes in the Authorization header (and no profile id is sent, the
 * API ignores one anyway); a guest sends the cookie id as `profile_id`. Personal reads are never cached.
 */
function asCaller(who?: Who | null) {
  const params = new URLSearchParams();
  const headers: Record<string, string> = {};
  if (who?.token) headers.Authorization = `Bearer ${who.token}`;
  else if (who?.guestId) params.set("profile_id", who.guestId);
  const personal = isPersonal(who);
  return { params, headers, personal, init: personal ? { cache: "no-store" as const, headers } : undefined };
}

const withQuery = (path: string, params: URLSearchParams) => (params.size ? `${path}?${params}` : path);

async function optional<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

/** Accepts a media-tab payload (also the older plain list of rails); anything else counts as a failure. */
function asMediaFeed(data: unknown): MediaFeed {
  if (Array.isArray(data)) return { hero: [], rails: data as Rail[], chips: [] };
  const feed = data as Partial<MediaFeed> | null;
  if (feed && Array.isArray(feed.rails)) {
    return { hero: feed.hero ?? [], rails: feed.rails, chips: feed.chips ?? [] };
  }
  throw new Error(`unexpected media payload: ${JSON.stringify(data)?.slice(0, 120)}`);
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

  /** For a known caller the feed is personal, so it is never cached. */
  home(who?: Who | null): Promise<HomeFeed> {
    if (API_MODE !== "live") return snapshot("home");
    const c = asCaller(who);
    return liveOr(
      () => live<HomeFeed>(withQuery("/recs/home", c.params), c.init ?? { next: { revalidate: 300 } }, PAGE_TIMEOUT_MS),
      () => snapshot("home"),
    );
  },

  /** A media tab: hero, chips and rails. For a known caller it's personal, so never cached. */
  async media(media: MediaType, who?: Who | null, chip?: string | null): Promise<MediaFeed> {
    const fromSnapshot = () => snapshot<MediaFeed>(MEDIA_SNAPSHOT[media]);
    if (API_MODE !== "live") return fromSnapshot();
    const c = asCaller(who);
    if (chip) c.params.set("chip", chip);
    return liveOr(
      async () =>
        asMediaFeed(
          await live<unknown>(
            withQuery(`/recs/media/${media}`, c.params),
            c.init ?? { next: { revalidate: 300 } },
            PAGE_TIMEOUT_MS,
          ),
        ),
      async () => asMediaFeed(await fromSnapshot()),
    );
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

  async search(q: string, media?: MediaType, filters: SearchFilters = {}): Promise<SearchResult> {
    if (API_MODE !== "live") return snapshotSearch(q, media);
    const params = new URLSearchParams({ q, limit: "60" });
    if (media) params.set("media", media);
    for (const [key, on] of Object.entries(filters)) if (on) params.set(key, "true");
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

  /** Why this work suits this caller; null with no taste signal, in snapshot mode, or on any error. */
  async why(id: string, who?: Who | null): Promise<Explanation | null> {
    const c = asCaller(who);
    if (API_MODE !== "live" || !c.personal) return null;
    return optional(
      () => live<Explanation | null>(withQuery(`/recs/why/${pathId(id)}`, c.params), c.init, PAGE_TIMEOUT_MS),
      null,
    );
  },

  /** Nearest works from every other medium. An extra section, so errors just hide it. */
  async across(id: string, who?: Who | null): Promise<Rail | null> {
    if (API_MODE !== "live") return null;
    const c = asCaller(who);
    return optional(() => live<Rail>(withQuery(`/recs/across/${pathId(id)}`, c.params), c.init, PAGE_TIMEOUT_MS), null);
  },

  /** Neighbours of a work, for the up-next column. */
  async upNext(id: string): Promise<Work[]> {
    if (API_MODE !== "live") return [];
    const rail = await optional(() => live<Rail>(`/recs/because/${pathId(id)}`, undefined, PAGE_TIMEOUT_MS), null);
    return rail?.items ?? [];
  },

  /** The taste summary for the caller; null in snapshot mode, with no profile, or on any error. */
  async profile(who?: Who | null): Promise<TasteProfile | null> {
    const c = asCaller(who);
    if (API_MODE !== "live" || !c.personal) return null;
    return optional(() => live<TasteProfile>(withQuery("/profile", c.params), c.init ?? NO_STORE, PAGE_TIMEOUT_MS), null);
  },

  /** Browser only (live mode). Everything stored for the caller, parsed. */
  exportData(who: Who): Promise<unknown> {
    const c = asCaller(who);
    return live(withQuery("/profile/export", c.params), c.init ?? NO_STORE);
  },

  /** Browser only (live mode). The CSV goes as the raw body; matching may take a while. */
  importCsv(source: ImportSource, who: Who, csv: string): Promise<ImportResult> {
    const c = asCaller(who);
    return live(withQuery(`/imports/${source}`, c.params), {
      method: "POST",
      headers: { ...c.headers, "Content-Type": "text/csv" },
      body: csv,
    });
  },

  /** Browser only (live mode). */
  sendEvents(events: Omit<EventIn, "profile_id">[], who: Who): Promise<EventAck> {
    const c = asCaller(who);
    return live("/events", {
      method: "POST",
      headers: { ...c.headers, "Content-Type": "application/json" },
      body: JSON.stringify(events.map((e) => ({ ...e, profile_id: who.guestId }))),
    });
  },

  /** Server side only. Folds the guest profile into the signed-in account. */
  mergeGuest(token: string, guestProfileId: string): Promise<MergeResult> {
    return live("/account/merge", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ guest_profile_id: guestProfileId }),
      cache: "no-store",
    }, PAGE_TIMEOUT_MS);
  },

  /** Server side only. */
  account(token: string): Promise<AccountInfo> {
    return live("/account/me", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }, PAGE_TIMEOUT_MS);
  },

  /** Server side only. Records the 18+ and privacy confirmation (Google sign-ups). */
  recordConsent(token: string): Promise<AccountInfo> {
    return live("/account/consent", { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }, PAGE_TIMEOUT_MS);
  },

  /** Server side only. Removes the account's profile, events and imports. */
  async deleteAccountData(token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError(res.status, `/account → ${res.status}`);
  },
};
