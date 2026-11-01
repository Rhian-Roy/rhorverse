import { Hero } from "@/components/hero/Hero";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";

export default async function HomePage() {
  const feed = await api.home();
  return (
    <>
      <Hero items={feed.hero} />
      {feed.rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
