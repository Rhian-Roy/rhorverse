import { expect, test } from "@playwright/test";

// Runs in API_MODE=snapshot (playwright.config), so no backend is needed.
test("search filters by text and by media chip", async ({ page }) => {
  await page.goto("/search");
  const results = page.locator("main ul li");
  await expect(results.first()).toBeVisible();
  const all = await results.count();

  await page.getByRole("searchbox", { name: "Search" }).fill("Relay");
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText("The Relay");

  await page.getByRole("searchbox", { name: "Search" }).fill("");
  await expect(results).toHaveCount(all);

  const group = page.getByRole("group", { name: "Media type" });
  await group.getByRole("button", { name: "Movies", exact: true }).click();
  await expect(results.first()).toContainText("Sample Film");
  await expect(page.getByText("Sample Series")).toHaveCount(0);
});
