import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { SourceLink } from "@/components/attribution/SourceLink";
import { Availability } from "@/components/detail/Availability";
import { CastRow } from "@/components/detail/CastRow";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { TagCloud } from "@/components/detail/TagCloud";
import { UpNext } from "@/components/detail/UpNext";
import { WhyHere } from "@/components/detail/WhyHere";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { serverProfileId } from "@/lib/server-profile";

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await api.work(id);
  if (!work) notFound();
  const pid = await serverProfileId();
  const [why, across, upNext] = await Promise.all([api.why(id, pid), api.across(id, pid), api.upNext(id)]);
  return (
    <>
      <DetailHeader work={work} />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {work.overview ? <p className="max-w-3xl text-ink-muted">{work.overview}</p> : null}
          {why ? <WhyHere explanation={why} /> : null}
          {work.media !== "anime" ? <Availability providers={work.availability} /> : null}
          <TagCloud tags={work.tags} facets={work.facets} />
          <CastRow cast={work.facets.cast ?? []} />
          {across?.items.length ? <Rail rail={across} /> : null}
          <div className="flex flex-col gap-1">
            <SourceLink source={work.source} href={work.source_url} />
            <Credit source={work.media === "anime" ? "anilist" : "tmdb"} />
          </div>
        </div>
        <UpNext items={upNext} />
      </div>
    </>
  );
}
