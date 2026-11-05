import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ chip?: string }> }) {
  const { chip } = await searchParams;
  return <MediaTab media="game" title="Games" chip={chip} />;
}
