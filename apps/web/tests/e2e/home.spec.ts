import { expect, test } from "./fixtures";

test("home loads and shows the TopNav", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Movies" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
});

test("every page carries active data-source credits", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const name of ["TMDB", "JustWatch", "AniList", "RAWG"]) {
    await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", /^https:\/\//);
  }
  await expect(footer.getByRole("link", { name: "All credits" })).toHaveAttribute("href", "/about");
});

test("a new visitor's profile page offers real next steps", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Your taste" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Import Letterboxd" })).toHaveAttribute("href", "/import");
});

test("tile actions are hidden in snapshot mode, where there's no API to tell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main [data-tile]").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-action]")).toHaveCount(0);
});
