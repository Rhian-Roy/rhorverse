// Mirrors services/api/src/rhorverse/schemas.py. Keep in sync.

export type MediaType = "movie" | "tv" | "anime" | "music" | "game";

/** `auto` picks the shape from each work's medium, for rails that mix media. */
export type TileVariant = "poster" | "landscape" | "square" | "capsule" | "auto";

export interface ImageSet {
  poster?: string | null;
  backdrop?: string | null;
  square?: string | null;
  capsule?: string | null;
}

export interface Work {
  id: string;
  media: MediaType;
  title: string;
  year?: number | null;
  overview?: string | null;
  tags: string[];
  images: ImageSet;
  source: string;
  source_id: string;
  /** Data-derived reason this work is featured, e.g. "Because you liked X". */
  why?: string | null;
}

export interface Provider {
  name: string;
  kind: "flatrate" | "rent" | "buy" | "free" | "ads";
  logo?: string | null;
  link?: string | null;
}

export interface WorkDetail extends Work {
  facets: Record<string, string[]>;
  availability: Provider[];
  /** The work's page on its data source (RAWG requires this backlink). */
  source_url?: string | null;
}

export interface Explanation {
  because_id: string;
  because_title: string;
  reason: string;
}

export interface Rail {
  id: string;
  title: string;
  variant: TileVariant;
  ranked?: boolean;
  items: Work[];
  explanation?: Explanation | null;
}

export interface HomeFeed {
  hero: Work[];
  rails: Rail[];
}

export interface SearchResult {
  query: string;
  media?: MediaType | null;
  items: Work[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration_s: number;
  preview_url?: string | null;
}

export type EventKind = "view" | "like" | "dislike" | "save" | "consumed" | "skip";

export interface EventIn {
  profile_id: string;
  work_id: string;
  kind: EventKind;
  weight: number;
}

export interface EventAck {
  accepted: number;
}

export interface TasteProfile {
  profile_id: string;
  top_tags: string[];
  counts: Partial<Record<MediaType, number>>;
}

export type ImportSource = "netflix" | "letterboxd" | "anilist" | "steam";

export interface ImportResult {
  source: ImportSource;
  status: "queued" | "done" | "failed";
  matched: number;
  unmatched: number;
  fetched: number;
  unmatched_titles: string[];
}
