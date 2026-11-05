import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "TV shows" };

export default async function ShowsPage({ searchParams }: { searchParams: Promise<{ chip?: string }> }) {
  const { chip } = await searchParams;
  return <MediaTab media="tv" title="TV shows" chip={chip} />;
}
