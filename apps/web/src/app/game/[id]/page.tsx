import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { SourceLink } from "@/components/attribution/SourceLink";
import { Section } from "@/components/detail/Section";
import { TagCloud } from "@/components/detail/TagCloud";
import { UpNext } from "@/components/detail/UpNext";
import { WhyHere } from "@/components/detail/WhyHere";
import { Capsule } from "@/components/game/Capsule";
import { api } from "@/lib/api";
import { serverWho } from "@/lib/server-profile";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await api.work(id);
  if (!game) notFound();
  const [why, upNext] = await Promise.all([api.why(id, await serverWho()), api.upNext(id)]);
  return (
    <>
      <Capsule work={game} />
      <div className="flex flex-wrap items-start gap-x-16 gap-y-12 pt-6">
        <div className="flex min-w-0 max-w-215 flex-[999_1_40rem] flex-col gap-16">
          {game.overview ? (
            <Section id="overview" title="Overview">
              <p className="max-w-170 text-lg leading-relaxed text-ink">{game.overview}</p>
            </Section>
          ) : null}
          {why ? <WhyHere explanation={why} /> : null}
          <TagCloud tags={game.tags} facets={game.facets} shared={why?.shared_tags} />
          <div className="flex flex-col gap-1">
            <SourceLink source={game.source} href={game.source_url} />
            <Credit source={game.source === "rawg" ? "rawg" : "igdb"} />
          </div>
        </div>
        <UpNext items={upNext} />
      </div>
    </>
  );
}
