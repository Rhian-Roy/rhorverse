import { expect, test } from "./fixtures";

test("arrow keys move between tiles and between rails", async ({ page }) => {
  await page.goto("/");
  const rails = page.locator("main [data-rail]");
  await expect(rails.nth(1)).toBeVisible({ timeout: 20_000 });
  const first = rails.nth(0).locator("[data-tile]");
  const second = rails.nth(1).locator("[data-tile]");

  await first.first().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(first.nth(2)).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(second.nth(2)).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(first.nth(2)).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expect(first.nth(1)).toBeFocused();
});

test("TV mode scales type and adds the overscan safe area", async ({ page }) => {
  await page.goto("/?tv=1");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-tv", "true", { timeout: 20_000 });
  await expect(html).toHaveCSS("font-size", "22.4px");
  const padding = await page.locator("body").evaluate((el) => getComputedStyle(el).paddingLeft);
  expect(Number.parseFloat(padding)).toBeCloseTo(page.viewportSize()!.width * 0.05, 0);
});

test("the Profile toggle turns TV mode on and remembers it", async ({ page }) => {
  await page.goto("/profile");
  const toggle = page.getByRole("button", { name: "TV mode" });
  await expect(async () => {
    await toggle.click({ timeout: 1_000 });
    await expect(page.locator("html")).toHaveAttribute("data-tv", "true", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-tv", "true");
});
