// next/image custom loader: picks the closest provider size variant for a width.
// TMDB: https://image.tmdb.org/t/p/<size>/<path>
// IGDB: https://images.igdb.com/igdb/image/upload/t_<size>/<id>.jpg
import type { ImageLoaderProps } from "next/image";

const TMDB_SIZES = [92, 154, 185, 342, 500, 780, 1280] as const;
const IGDB_SIZES: ReadonlyArray<readonly [number, string]> = [
  [90, "t_thumb"],
  [264, "t_cover_big"],
  [569, "t_screenshot_med"],
  [889, "t_screenshot_big"],
  [1280, "t_720p"],
  [1920, "t_1080p"],
];

export function tmdbSize(width: number): string {
  const hit = TMDB_SIZES.find((s) => s >= width);
  return hit ? `w${hit}` : "original";
}

export function igdbSize(width: number): string {
  return (IGDB_SIZES.find(([s]) => s >= width) ?? IGDB_SIZES[IGDB_SIZES.length - 1]!)[1];
}

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (src.includes("image.tmdb.org/t/p/")) {
    return src.replace(/\/t\/p\/[^/]+\//, `/t/p/${tmdbSize(width)}/`);
  }
  if (src.includes("images.igdb.com/igdb/image/upload/")) {
    return src.replace(/\/upload\/t_[^/]+\//, `/upload/${igdbSize(width)}/`);
  }
  // Local or fixed-size sources: pass through, keeping next/image's width hint.
  return src.startsWith("/") ? `${src}${src.includes("?") ? "&" : "?"}w=${width}` : src;
}
