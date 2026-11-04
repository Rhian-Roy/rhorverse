import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { SourceLink } from "@/components/attribution/SourceLink";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { TrackRow } from "@/components/music/TrackRow";
import { api } from "@/lib/api";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await api.work(id);
  if (!album) notFound();
  const tracks = await api.tracks(id);
  return (
    <>
      <DetailHeader work={album} />
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
      <div className="flex flex-col gap-1">
        <SourceLink source={album.source} href={album.source_url} />
        <Credit source={album.source === "deezer" ? "deezer" : "itunes"} />
      </div>
    </>
  );
}
