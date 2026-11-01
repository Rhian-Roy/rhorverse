import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { TagCloud } from "@/components/detail/TagCloud";
import { api } from "@/lib/api";

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await api.work(id);
  if (!artist) notFound();
  return (
    <>
      <DetailHeader work={artist} />
      <TagCloud tags={artist.tags} />
      <Credit source="lastfm" />
    </>
  );
}
