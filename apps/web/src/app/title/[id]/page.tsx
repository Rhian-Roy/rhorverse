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
import { serverWho } from "@/lib/server-profile";

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await api.work(id);
  if (!work) notFound();
  const who = await serverWho();
  const [why, across, upNext] = await Promise.all([api.why(id, who), api.across(id, who), api.upNext(id)]);
  return (
    <>
      <DetailHeader work={work} />
      <div className="flex flex-wrap items-start gap-x-16 gap-y-12 pt-6">
        <div className="flex min-w-0 max-w-215 flex-[999_1_40rem] flex-col gap-16">
          {work.overview ? (
            <section aria-labelledby="overview">
              <h2 id="overview" className="mb-4 font-display text-title text-ink">
                Overview
              </h2>
              <p className="max-w-170 text-lg leading-relaxed text-ink">{work.overview}</p>
            </section>
          ) : null}
          {why ? <WhyHere explanation={why} /> : null}
          {work.media !== "anime" ? <Availability providers={work.availability} /> : null}
          <TagCloud tags={work.tags} facets={work.facets} shared={why?.shared_tags} />
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
