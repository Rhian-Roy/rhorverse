import { expect, test } from "@playwright/test";

// TODO: open a tile from home, assert DetailHeader + Availability + credit.
test.skip("detail page shows header, availability and credit", async () => {});

// Runs in API_MODE=snapshot: feedback needs the API, so the actions are hidden.
test("snapshot detail page renders without feedback actions", async ({ page }) => {
  await page.goto("/");
  const tile = page.locator('main a[href^="/title/"]').first();
  await expect(tile).toBeVisible({ timeout: 20_000 });
  await tile.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Loved it" })).toHaveCount(0);
});
