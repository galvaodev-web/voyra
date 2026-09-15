import { defineConfig, devices } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "3107";
if (!/^\d{2,5}$/.test(port)) throw new Error("PLAYWRIGHT_PORT inválida");
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/pages.spec.ts", "**/*.test.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: baseURL,
    env: {
      SITE_URL: baseURL,
      RATE_LIMIT_SECRET: "playwright-local-rate-limit-secret-32-bytes",
    },
    reuseExistingServer: false,
    timeout: 120000,
  },
});
