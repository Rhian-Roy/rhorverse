import { expect, test } from "@playwright/test";

// The Understory spec from the build plan (section 7.3), checked in the real browser.
const INK_950 = "rgb(11, 17, 14)";
const LIGHT_BG = "rgb(246, 248, 245)";
const SIGNAL_400 = "rgb(61, 255, 154)";
const FOREST_700 = "rgb(27, 77, 51)";
const EMERALD_500 = "rgb(31, 174, 110)";
const DARK_INK = "rgb(6, 17, 11)";


test("dark green palette and the three plan fonts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", INK_950);
  await expect(page.locator("body")).toHaveCSS("font-family", /^"?Instrument Sans/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /^"?Bricolage Grotesque/);
  await expect(page.locator("main [data-tile] p").nth(1)).toHaveCSS("font-family", /^"?IBM Plex Mono/);
});

test("primary button is emerald with dark ink, active tab is forest", async ({ page }) => {
  await page.goto("/");
  const details = page.getByRole("link", { name: "Details", exact: true });
  await expect(details).toHaveCSS("background-color", EMERALD_500);
  await expect(details).toHaveCSS("color", DARK_INK);
  const active = page.getByRole("navigation", { name: "Primary" }).locator('[aria-current="page"]');
  await expect(active).toHaveCSS("background-color", FOREST_700);
});

test("hero is a tall backdrop photo", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Featured" });
  await expect(hero.locator("img").first()).toBeVisible();
  const { height } = (await hero.boundingBox())!;
  expect(height).toBeGreaterThanOrEqual((page.viewportSize()!.height * 0.7) - 1);
});

test("a keyboard-focused tile gets the neon ring, scale and dimmed neighbours", async ({ page }) => {
  await page.goto("/");
  const rail = page.locator("main [data-rail]").first();
  const tiles = rail.locator("[data-tile]");
  await tiles.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tiles.nth(1)).toBeFocused();
  const art = tiles.nth(1).locator("[data-tile-art]");
  await expect(art).toHaveCSS("scale", "1.06");
  await expect(art).toHaveCSS("outline-color", SIGNAL_400);
  await expect(art).toHaveCSS("outline-offset", "3px");
  await expect(art).toHaveCSS("box-shadow", /16px 40px/);
  await expect(tiles.nth(2)).toHaveCSS("opacity", "0.85");
});

test("the nav blurs only after scrolling past 24 px", async ({ page }) => {
  await page.goto("/");
  const header = page.locator("header").first();
  await expect(header).toHaveCSS("backdrop-filter", "none");
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect(header).not.toHaveCSS("backdrop-filter", "none");
});

test("the theme toggle switches to light and survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(async () => {
    await page.getByRole("button", { name: "Switch to light theme" }).click({ timeout: 1_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_BG);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", INK_950);
});

test("light theme is applied before first paint", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rhorverse_theme", "light"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // The attribute must come from the inline script in <head>, not from React after hydration.
  const html = await (await page.request.get("/")).text();
  expect(html.indexOf("rhorverse_theme")).toBeGreaterThan(-1);
  expect(html.indexOf("rhorverse_theme")).toBeLessThan(html.indexOf("<body"));
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("all nav tabs get their own full-width row, with no sideways scroll", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "Primary" }).locator("ul");
    const box = (await tabs.boundingBox())!;
    expect(box.width).toBeGreaterThan(300);
    await expect(tabs.getByRole("link", { name: "Movies" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

test("the tokens review page is hidden in production", async ({ page }) => {
  const res = await page.goto("/dev/tokens");
  expect(res?.status()).toBe(404);
});
