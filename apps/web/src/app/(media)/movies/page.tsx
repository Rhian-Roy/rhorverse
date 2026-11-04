import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "Movies" };

export default function MoviesPage() {
  return <MediaTab media="movie" title="Movies" />;
}
