import { expect, test } from "./fixtures";

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

test("a tab with backdrops shows its own hero, with a data-derived line", async ({ page }) => {
  await page.goto("/movies");
  const hero = page.getByRole("region", { name: "Featured" });
  await expect(hero).toBeVisible({ timeout: 20_000 });
  await expect(hero).toContainText(/#\d+ most popular in film/);
});
