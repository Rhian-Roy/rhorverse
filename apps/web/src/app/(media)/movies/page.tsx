import type { Metadata } from "next";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Movies" };

export default async function MoviesPage() {
  const rails = await api.media("movie");
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-ink">Movies</h1>
      {rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
