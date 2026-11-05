import type { Metadata } from "next";
import { MediaTab } from "@/components/shell/MediaTab";

export const metadata: Metadata = { title: "Anime" };

export default async function AnimePage({ searchParams }: { searchParams: Promise<{ chip?: string }> }) {
  const { chip } = await searchParams;
  return <MediaTab media="anime" title="Anime" chip={chip} />;
}
