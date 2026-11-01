import type { Metadata } from "next";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Games" };

export default async function GamesPage() {
  const rails = await api.media("game");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">Games</h1>
      {rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
