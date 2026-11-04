import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { SourceLink } from "@/components/attribution/SourceLink";
import { TagCloud } from "@/components/detail/TagCloud";
import { Capsule } from "@/components/game/Capsule";
import { api } from "@/lib/api";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await api.work(id);
  if (!game) notFound();
  return (
    <>
      <Capsule work={game} />
      <TagCloud tags={game.tags} facets={game.facets} />
      <div className="flex flex-col gap-1">
        <SourceLink source={game.source} href={game.source_url} />
        <Credit source={game.source === "rawg" ? "rawg" : "igdb"} />
      </div>
    </>
  );
}
