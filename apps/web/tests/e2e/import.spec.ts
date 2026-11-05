import { expect, test } from "./fixtures";

// Runs in API_MODE=snapshot: the dialog works, but submitting explains the live API is needed.
test("letterboxd import dialog explains it needs the live API", async ({ page }) => {
  await page.goto("/import");
  const dialog = page.getByRole("dialog", { name: "Import from Letterboxd" });
  // `next dev` compiles /import on first hit; a click before hydration does nothing, so retry.
  await expect(async () => {
    await page.getByRole("button", { name: "Import from Letterboxd" }).click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await dialog.getByLabel("Export file").setInputFiles({
    name: "watched.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Date,Name,Year,Letterboxd URI\n2024-01-03,The Matrix,1999,x\n"),
  });
  await dialog.getByRole("button", { name: "Start import" }).click();
  await expect(dialog.getByRole("status")).toContainText("Imports need the live API");
});
