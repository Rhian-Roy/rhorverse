import { expect, test } from "@playwright/test";

const TABS = [
  { path: "/movies", heading: "Movies" },
  { path: "/shows", heading: "TV shows" },
  { path: "/anime", heading: "Anime" },
  { path: "/music", heading: "Music" },
  { path: "/games", heading: "Games" },
];

// Runs in API_MODE=snapshot: every tab renders its heading and at least one rail with a tile.
for (const { path, heading } of TABS) {
  test(`${heading} tab renders rails`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("main section a").first()).toBeVisible();
  });
}
