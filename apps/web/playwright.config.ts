import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A production build, compiled once up front: `next dev` compiles each route on first hit, which
  // made parallel tests time out on a cold start. It's also what Vercel serves.
  webServer: {
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { API_MODE: "snapshot" },
  },
});
