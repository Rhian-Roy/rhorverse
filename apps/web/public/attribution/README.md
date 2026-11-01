# Provider logos

These logos are **not** in the repo. Download the official files from each provider's brand page, use them as their guidelines say, and save them here with these names:

| File | Source | Rule of thumb |
|---|---|---|
| `tmdb.svg` | https://www.themoviedb.org/about/logos-attribution | Required logo + "uses the TMDB API but is not endorsed or certified by TMDB" notice. Logo less prominent than ours. |
| `justwatch.svg` | https://www.justwatch.com/ (attribution required for TMDB watch-provider data) | Credit wherever availability is shown. |
| `rawg.svg` | https://rawg.io/apidocs | Link back to RAWG on every page using its data. |
| `igdb.svg` | https://www.igdb.com/ / Twitch developer terms | Credit IGDB as the source. |

Text credits are in `src/components/attribution/Credit.tsx` and always render, even without the logo files.
