import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "Games" };

export default function GamesPage() {
  return <MediaTab media="game" title="Games" />;
}
