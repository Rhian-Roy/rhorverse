import type { Metadata } from "next";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "TV shows" };

export default async function ShowsPage() {
  const rails = await api.media("tv");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">TV shows</h1>
      {rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
