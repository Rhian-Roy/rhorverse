import { expect, test } from "@playwright/test";
import { distinctive } from "./snapshot-data";

// Runs in API_MODE=snapshot (playwright.config), so no backend is needed.
test("search filters by text and by media chip", async ({ page }) => {
  const movie = distinctive("movie");
  const show = distinctive("tv");
  await page.goto("/search");
  const results = page.locator("main ul li");
  // Generous: `next dev` compiles /search on first hit and may reload the page.
  await expect(results.first()).toBeVisible({ timeout: 20_000 });
  const all = await results.count();

  const box = page.getByRole("searchbox", { name: "Search" });
  await box.fill(movie.title);
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText(movie.title);

  await box.fill("");
  await expect(results).toHaveCount(all);

  const group = page.getByRole("group", { name: "Media type" });
  await group.getByRole("button", { name: "Movies", exact: true }).click();
  await expect(results.filter({ hasText: movie.title })).toHaveCount(1);
  await expect(results.filter({ hasText: show.title })).toHaveCount(0);
});
