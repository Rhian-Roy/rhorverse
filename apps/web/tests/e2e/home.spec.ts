import { expect, test } from "@playwright/test";

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
