import { cookies } from "next/headers";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { PROFILE_COOKIE } from "@/lib/profile";
import type { MediaType } from "@/lib/types";

/** One media tab (Movies, TV, Anime, Music, Games): its rails, personal when there's a profile. */
export async function MediaTab({ media, title }: { media: MediaType; title: string }) {
  const pid = api.mode === "live" ? (await cookies()).get(PROFILE_COOKIE)?.value : undefined;
  const rails = await api.media(media, pid);
  return (
    <>
      <h1 className="font-display text-display-l text-ink">{title}</h1>
      {rails.length === 0 ? (
        <p className="max-w-xl text-ink-muted">
          Nothing here yet. The {title.toLowerCase()} catalogue hasn&apos;t been loaded.
        </p>
      ) : (
        rails.map((rail) => <Rail key={rail.id} rail={rail} />)
      )}
    </>
  );
}
