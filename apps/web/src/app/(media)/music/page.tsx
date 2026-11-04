import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "Music" };

export default function MusicPage() {
  return <MediaTab media="music" title="Music" />;
}
