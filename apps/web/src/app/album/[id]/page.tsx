import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { DetailHeader } from "@/components/detail/DetailHeader";
import { TrackRow } from "@/components/music/TrackRow";
import { api } from "@/lib/api";
import type { Track } from "@/lib/types";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await api.work(id);
  if (!album) notFound();
  const tracks: Track[] = []; // TODO: GET /works/{id}/tracks
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
      <Credit source="deezer" />
    </>
  );
}
