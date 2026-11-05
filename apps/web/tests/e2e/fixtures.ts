// Every e2e test imports `test` from here. Snapshots hold real image URLs, so without this a slow
// TMDB or Apple CDN makes page loads time out. Tests check layout and behaviour, not remote pictures.
import { test as base } from "@playwright/test";

const IMAGE_HOSTS = /^https:\/\/(image\.tmdb\.org|[^/]*\.mzstatic\.com|s4\.anilist\.co|media\.rawg\.io)\//;

export const test = base.extend<{ blockRemoteImages: void }>({
  blockRemoteImages: [
    async ({ page }, use) => {
      await page.route(IMAGE_HOSTS, (route) => route.abort());
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
