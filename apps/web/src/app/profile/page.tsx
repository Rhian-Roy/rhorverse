import type { Metadata } from "next";
import Link from "next/link";
import { hrefFor } from "@/components/rail/Tile";
import { TvToggle } from "@/components/shell/TvToggle";
import { api } from "@/lib/api";
import { serverProfileId } from "@/lib/server-profile";
import type { MediaType, TasteTag } from "@/lib/types";

export const metadata: Metadata = { title: "Your taste" };

const MEDIA_LABEL: Record<MediaType, string> = { movie: "Films", tv: "TV", anime: "Anime", music: "Albums", game: "Games" };
const SOURCE_LABEL: Record<string, string> = { app: "Rated here", letterboxd: "From Letterboxd" };

function TagBar({ tag }: { tag: TasteTag }) {
  const examples = Object.entries(tag.examples).map(([media, title]) => `${title} (${media})`);
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-ink">{tag.tag}</span>
        <span className="truncate text-sm text-ink-faint">{examples.join(" · ")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-overlay">
        <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.round(tag.weight * 100)}%` }} />
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-card border border-line bg-surface-raised p-4">
      <span className="font-mono text-2xl text-ink">{value}</span>
      <span className="text-sm text-ink-muted">{label}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const pid = await serverProfileId();
  const profile = await api.profile(pid);
  const hasTaste = !!profile && profile.top_tags.length > 0;
  return (
    <>
      <h1 className="font-display text-display-l text-ink">Your taste</h1>
      {hasTaste ? (
        <>
          <section aria-labelledby="top-tags" className="flex max-w-3xl flex-col gap-4">
            <h2 id="top-tags" className="font-display text-title text-ink">
              What you lean towards
            </h2>
            <ol className="flex flex-col gap-3">
              {profile.top_tags.map((tag) => (
                <TagBar key={tag.tag} tag={tag} />
              ))}
            </ol>
          </section>
          <section aria-labelledby="counts" className="flex flex-col gap-4">
            <h2 id="counts" className="font-display text-title text-ink">
              What we know about
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(profile.counts).map(([media, n]) => (
                <Stat key={media} label={`${MEDIA_LABEL[media as MediaType]} seen`} value={n} />
              ))}
              {Object.entries(profile.sources).map(([source, n]) => (
                <Stat key={source} label={SOURCE_LABEL[source] ?? source} value={n} />
              ))}
            </div>
          </section>
          {profile.not_interested.length > 0 ? (
            <section aria-labelledby="not-interested" className="flex flex-col gap-3">
              <h2 id="not-interested" className="font-display text-title text-ink">
                Not interested
              </h2>
              <ul className="flex flex-wrap gap-2">
                {profile.not_interested.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={hrefFor(w)}
                      className="block rounded-pill border border-line px-3 py-1 text-sm text-ink-muted hover:text-ink"
                    >
                      {w.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {pid ? (
            <a href={api.exportUrl(pid)} className="w-fit text-sm text-link hover:underline">
              Export my data as JSON
            </a>
          ) : null}
        </>
      ) : (
        <p className="max-w-xl text-ink-muted">
          Nothing here yet.{" "}
          <Link href="/import" className="text-link hover:underline">
            Import Letterboxd
          </Link>{" "}
          to hide films you&apos;ve seen, or press &quot;Loved it&quot; on{" "}
          <Link href="/search" className="text-link hover:underline">
            anything you find
          </Link>{" "}
          and your taste builds from there.
        </p>
      )}
      <section aria-labelledby="display" className="flex flex-col gap-3">
        <h2 id="display" className="font-display text-title text-ink">
          Display
        </h2>
        <TvToggle />
      </section>
    </>
  );
}
