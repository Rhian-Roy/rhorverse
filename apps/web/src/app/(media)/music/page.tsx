import type { Metadata } from "next";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Music" };

export default async function MusicPage() {
  const rails = await api.media("music");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">Music</h1>
      {rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
