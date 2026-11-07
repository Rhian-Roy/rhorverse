import Image from "next/image";
import { notFound } from "next/navigation";
import { Credit } from "@/components/attribution/Credit";
import { SourceLink } from "@/components/attribution/SourceLink";
import { FeedbackActions } from "@/components/detail/FeedbackActions";
import { TrackRow } from "@/components/music/TrackRow";
import { Rail } from "@/components/rail/Rail";
import { api } from "@/lib/api";
import { serverWho } from "@/lib/server-profile";

const length = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds % 60)} s`;
};

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = await api.work(id);
  if (!album) notFound();
  const [tracks, across] = await Promise.all([api.tracks(id), api.across(id, await serverWho())]);
  const art = album.images.square ?? album.images.poster;
  const artist = album.facets.artist?.[0];
  const total = tracks.reduce((n, t) => n + t.duration_s, 0);
  const facts: [string, string][] = [
    album.year ? (["Released", String(album.year)] as [string, string]) : null,
    tracks.length ? (["Length", `${length(total)} · ${tracks.length} tracks`] as [string, string]) : null,
    album.facets.genres?.length ? (["Genre", album.facets.genres.slice(0, 3).join(", ")] as [string, string]) : null,
  ].filter((f): f is [string, string] => f !== null);
  return (
    <div className="flex flex-wrap items-start gap-x-16 gap-y-10 pt-4">
      <section aria-label="Album" className="flex min-w-0 max-w-130 flex-[1_1_26rem] flex-col gap-5">
        <div className="relative aspect-square w-full overflow-hidden rounded-sheet bg-brand">
          {art ? (
            <Image src={art} alt="" fill preload sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-end p-6 font-display text-4xl leading-tight font-bold tracking-tight text-ink-muted">
              {album.title}
            </span>
          )}
        </div>
        <p className="font-mono text-meta text-ink-muted">Album</p>
        <h1 className="font-display text-display-l tracking-[-0.03em] text-balance text-ink">{album.title}</h1>
        {artist ? <p className="text-lg font-semibold text-ink">{artist}</p> : null}
        {facts.length > 0 ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-sm leading-snug">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {api.mode === "live" ? <FeedbackActions workId={album.id} seenLabels={["Heard it", "Heard"]} /> : null}
      </section>

      <div className="flex min-w-0 max-w-205 flex-[999_1_35rem] flex-col gap-12">
        <section aria-labelledby="tracks">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="tracks" className="font-display text-title text-ink">
              Tracks
            </h2>
            {tracks.length > 0 ? <span className="font-mono text-meta text-ink-faint">Each track plays a 30-sec preview</span> : null}
          </div>
          {tracks.length === 0 ? (
            <p className="text-ink-muted">Track list coming soon.</p>
          ) : (
            <ol className="flex flex-col gap-0.5">
              {tracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i + 1} />
              ))}
            </ol>
          )}
          {tracks.length > 0 ? (
            <p className="mx-3 mt-4 font-mono text-meta text-ink-faint">
              {length(total)} total{album.year ? ` · ${album.year}` : ""}
            </p>
          ) : null}
        </section>
        {across?.items.length ? <Rail rail={across} /> : null}
        <div className="flex flex-col gap-1">
          <SourceLink source={album.source} href={album.source_url} />
          <Credit source={album.source === "deezer" ? "deezer" : "itunes"} />
        </div>
      </div>
    </div>
  );
}
