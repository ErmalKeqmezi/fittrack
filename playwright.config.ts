import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build and the LOCAL Supabase stack.
 * global-setup.ts resets the local database first (it refuses to run against
 * anything but localhost). Run: npm run test:e2e
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    timezoneId: "Europe/Berlin",
    locale: "en-GB",
    trace: "retain-on-failure",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
});
