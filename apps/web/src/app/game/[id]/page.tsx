import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
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
      <Credit source={game.source === "rawg" ? "rawg" : "igdb"} />
    </>
  );
}
