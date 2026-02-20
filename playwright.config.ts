import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 600_000, // 10 min per test (CAPTCHA waits)
  expect: {
    timeout: 15_000,
  },
  retries: 0, // no retries - form state is not idempotent
  workers: 1, // sequential - single browser
  use: {
    baseURL: "https://ceac.state.gov",
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "ds160",
      use: { browserName: "chromium" },
    },
  ],
});
