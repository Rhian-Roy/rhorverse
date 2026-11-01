import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rhorverse/tokens"],
  env: {
    API_MODE: process.env.API_MODE ?? "snapshot",
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "images.igdb.com", pathname: "/igdb/image/upload/**" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "e-cdns-images.dzcdn.net" },
      { protocol: "https", hostname: "cdn-images.dzcdn.net" },
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
    ],
  },
};

export default nextConfig;
