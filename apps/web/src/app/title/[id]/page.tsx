import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { Availability } from "@/components/detail/Availability";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { TagCloud } from "@/components/detail/TagCloud";
import { api } from "@/lib/api";

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await api.work(id);
  if (!work) notFound();
  return (
    <>
      <DetailHeader work={work} />
      <TagCloud tags={work.tags} facets={work.facets} />
      {work.media !== "anime" ? <Availability providers={work.availability} /> : null}
      <Credit source={work.media === "anime" ? "anilist" : "tmdb"} />
    </>
  );
}
