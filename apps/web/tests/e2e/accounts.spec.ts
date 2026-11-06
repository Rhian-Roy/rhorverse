// Real accounts against a Supabase project. Skipped unless E2E_ACCOUNTS=1 and the project's URL,
// public key and secret key are in the environment (they are read by the web server too, so set them
// before `just test-web`). The test makes its own throwaway users and removes them afterwards.
//
// There is no inbox to open, so the confirmation link is minted with the admin API and followed
// through /auth/callback?token_hash=…, the same route a real emailed link lands on.
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(
  process.env.E2E_ACCOUNTS !== "1" || !URL || !SECRET,
  "set E2E_ACCOUNTS=1 with the Supabase URL, public key and secret key to run the account tests",
);

const PASSWORD = "Rhorverse-e2e-2026";
const admin = () => createClient(URL!, SECRET!, { auth: { persistSession: false, autoRefreshToken: false } });
const uniqueEmail = () => `rhorverse-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

async function removeUser(email: string) {
  const { data } = await admin().auth.admin.listUsers({ perPage: 200 });
  const user = data.users.find((u) => u.email === email);
  if (user) await admin().auth.admin.deleteUser(user.id);
}

test("sign up, set up, sign out, sign in", async ({ page }) => {
  const email = uniqueEmail();
  try {
    await page.goto("/sign-up");

    // Nothing is submitted until the form is complete, and every gap is named.
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.locator("form").getByRole("alert").first()).toHaveText("5 things to fix before we can create your account.");

    await page.getByLabel("Name", { exact: true }).fill("E2E Tester");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel(/18 or older/).check();
    await page.getByLabel(/read the Privacy notice/).check();
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    // Follow the confirmation link.
    const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
    expect(error).toBeNull();
    const hash = data?.properties?.hashed_token;
    await page.goto(`/auth/callback?token_hash=${hash}&type=magiclink&next=/onboarding`);
    await expect(page.getByRole("heading", { name: /Pick at least 5 favourites/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    await page.getByRole("link", { name: "Skip setup" }).click();
    await expect(page).toHaveURL("/");

    // Signed in: the nav shows the account menu, not the Sign in pill.
    const menu = page.getByRole("button", { name: "Account menu for E2E Tester" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);

    await menu.click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

    // Back in with the password.
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("button", { name: "Account menu for E2E Tester" })).toBeVisible();
  } finally {
    await removeUser(email);
  }
});

test("a wrong password says so and keeps you out", async ({ page }) => {
  const email = uniqueEmail();
  try {
    const { error } = await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    expect(error).toBeNull();
    await page.goto("/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("don't match");
    await expect(page).toHaveURL(/\/sign-in/);
  } finally {
    await removeUser(email);
  }
});

test("account page: deleting the account removes the sign-in", async ({ page }) => {
  const email = uniqueEmail();
  try {
    const { error } = await admin().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    expect(error).toBeNull();
    await page.goto("/sign-in?next=/account");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();

    await page.getByRole("button", { name: "Delete account" }).click();
    const confirmButton = page.getByRole("dialog").getByRole("button", { name: "Delete account" });
    await expect(confirmButton).toBeDisabled();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await confirmButton.click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

    const { data } = await admin().auth.admin.listUsers({ perPage: 200 });
    expect(data.users.find((u) => u.email === email)).toBeUndefined();
  } finally {
    await removeUser(email);
  }
});
