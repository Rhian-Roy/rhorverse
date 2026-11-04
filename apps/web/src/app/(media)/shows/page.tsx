import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "TV shows" };

export default function ShowsPage() {
  return <MediaTab media="tv" title="TV shows" />;
}
