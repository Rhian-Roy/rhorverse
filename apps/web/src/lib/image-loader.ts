// next/image custom loader: picks the closest provider size variant for a width.
// TMDB: https://image.tmdb.org/t/p/<size>/<path>
// IGDB: https://images.igdb.com/igdb/image/upload/t_<size>/<id>.jpg
// RAWG: https://media.rawg.io/media/games/<path> → /media/resize/<w>/-/games/<path>
// Apple: https://is1-ssl.mzstatic.com/image/thumb/<path>/<w>x<h>bb.jpg
// AniList: .../cover/large/<file> is 460 px wide (up to ~700 KB as PNG); .../cover/medium/<file> is 230 px
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

const RAWG_WIDTHS = [420, 640, 1280] as const;
export function appleWidth(width: number): number {
  // Any square size works on Apple's CDN; round up to 100 so nearby widths share a cached file.
  return Math.min(1000, Math.max(100, Math.ceil(width / 100) * 100));
}

/** AniList only has two cover sizes. 460 px is for the big ones; tiles are 160 px (320 on retina). */
export function anilistCover(src: string, width: number): string {
  return width > 400 ? src : src.replace("/cover/large/", "/cover/medium/");
}

export function rawgWidth(width: number): number {
  return RAWG_WIDTHS.find((w) => w >= width) ?? 1280;
}

export function tmdbSize(width: number): string {
  const hit = TMDB_SIZES.find((s) => s >= width);
  return hit ? `w${hit}` : "w1280"; // never "original": it can be many MB
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
  if (src.includes("media.rawg.io/media/games/")) {
    return src.replace("/media/games/", `/media/resize/${rawgWidth(width)}/-/games/`);
  }
  if (src.includes(".mzstatic.com/image/thumb/")) {
    const w = appleWidth(width);
    return src.replace(/\/\d+x\d+bb\.(jpg|png|webp)$/, `/${w}x${w}bb.$1`);
  }
  if (src.includes("s4.anilist.co/file/anilistcdn/media/anime/cover/")) {
    return anilistCover(src, width);
  }
  // Local or fixed-size sources: pass through, keeping next/image's width hint.
  return src.startsWith("/") ? `${src}${src.includes("?") ? "&" : "?"}w=${width}` : src;
}
