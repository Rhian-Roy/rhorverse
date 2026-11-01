export type CreditSource =
  | "tmdb"
  | "justwatch"
  | "anilist"
  | "igdb"
  | "rawg"
  | "deezer"
  | "itunes"
  | "musicbrainz"
  | "lastfm"
  | "steam";

export const CREDITS: Record<CreditSource, { text: string; href: string }> = {
  tmdb: {
    text: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    href: "https://www.themoviedb.org/",
  },
  justwatch: { text: "Streaming availability data by JustWatch.", href: "https://www.justwatch.com/" },
  anilist: { text: "Anime data from AniList.", href: "https://anilist.co/" },
  igdb: { text: "Game data from IGDB.", href: "https://www.igdb.com/" },
  rawg: { text: "Game data from RAWG.", href: "https://rawg.io/" },
  deezer: { text: "Music data and previews from Deezer.", href: "https://www.deezer.com/" },
  itunes: { text: "Music previews courtesy of Apple.", href: "https://www.apple.com/itunes/" },
  musicbrainz: { text: "Music metadata from MusicBrainz (CC0).", href: "https://musicbrainz.org/" },
  lastfm: { text: "Tags and similar artists from Last.fm.", href: "https://www.last.fm/" },
  steam: { text: "Library data from Steam. Not affiliated with Valve.", href: "https://store.steampowered.com/" },
};

/** Inline data-source credit, required wherever provider data is shown. */
export function Credit({ source }: { source: CreditSource }) {
  const c = CREDITS[source];
  return (
    <p className="text-xs text-ink-faint">
      <a href={c.href} target="_blank" rel="noreferrer" className="hover:text-ink-muted hover:underline">
        {c.text}
      </a>
    </p>
  );
}
