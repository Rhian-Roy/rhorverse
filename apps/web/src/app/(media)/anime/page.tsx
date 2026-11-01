import type { Metadata } from "next";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Anime" };

export default async function AnimePage() {
  const rails = await api.media("anime");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">Anime</h1>
      {rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
