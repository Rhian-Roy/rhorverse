import { cookies } from "next/headers";
import { Hero } from "@/components/hero/Hero";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { PROFILE_COOKIE } from "@/lib/profile";

export default async function HomePage() {
  const pid = api.mode === "live" ? (await cookies()).get(PROFILE_COOKIE)?.value : undefined;
  const feed = await api.home(pid);
  return (
    <>
      <Hero items={feed.hero} />
      {feed.rails.map((rail) => (
        <Rail key={rail.id} rail={rail} />
      ))}
    </>
  );
}
