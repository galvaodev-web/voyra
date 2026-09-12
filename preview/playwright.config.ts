import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../tests",
  testMatch: "pages.spec.ts",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  outputDir: "../test-results/pages",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PAGES_URL ?? "http://127.0.0.1:4173/voyra/",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.PAGES_URL
    ? undefined
    : {
        command: "npm run preview:pages",
        cwd: "..",
        url: "http://127.0.0.1:4173/voyra/",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
