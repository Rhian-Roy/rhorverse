import { expect, test } from "@playwright/test";

const TABS = [
  { path: "/movies", heading: "Movies" },
  { path: "/shows", heading: "TV shows" },
  { path: "/anime", heading: "Anime" },
  { path: "/music", heading: "Music" },
  { path: "/games", heading: "Games" },
];

// Runs in API_MODE=snapshot: every tab renders its heading and either rails with tiles or, for a
// medium with no catalogue yet, the empty-state line.
for (const { path, heading } of TABS) {
  test(`${heading} tab renders rails`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 20_000 });
    const tile = page.locator("main section a").first();
    const empty = page.getByText("Nothing here yet.");
    await expect(tile.or(empty)).toBeVisible();
  });
}
