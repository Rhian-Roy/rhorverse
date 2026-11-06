import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { SourceLink } from "@/components/attribution/SourceLink";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { TrackRow } from "@/components/music/TrackRow";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { serverWho } from "@/lib/server-profile";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await api.work(id);
  if (!album) notFound();
  const [tracks, across] = await Promise.all([api.tracks(id), api.across(id, await serverWho())]);
  return (
    <>
      <DetailHeader work={album} />
      {album.overview ? <p className="max-w-3xl text-ink-muted">{album.overview}</p> : null}
      <section aria-label="Tracks">
        {tracks.length === 0 ? (
          <p className="text-sm text-ink-muted">Track list coming soon.</p>
        ) : (
          <ol>
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i + 1} />
            ))}
          </ol>
        )}
      </section>
      {across?.items.length ? <Rail rail={across} /> : null}
      <div className="flex flex-col gap-1">
        <SourceLink source={album.source} href={album.source_url} />
        <Credit source={album.source === "deezer" ? "deezer" : "itunes"} />
      </div>
    </>
  );
}
