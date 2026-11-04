import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "Anime" };

export default function AnimePage() {
  return <MediaTab media="anime" title="Anime" />;
}
