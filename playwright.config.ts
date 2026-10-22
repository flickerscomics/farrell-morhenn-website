import { defineConfig, devices } from "@playwright/test";

// Builds the static export with a GitHub Pages style base path and serves it
// the way Pages does, so the tests exercise exactly what gets deployed.
const PORT = 3200;
const BASE = "/farrell-morhenn-website";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}${BASE}/`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run build && node scripts/serve.mjs",
    url: `http://localhost:${PORT}${BASE}/`,
    timeout: 300_000,
    reuseExistingServer: false,
    // Built from the sample content in tests/fixtures, so the tests don't depend on what the live site holds.
    env: { CONTENT_DIR: "tests/fixtures/content", PAGES_BASE_PATH: BASE, PORT: String(PORT), SITE_URL: `https://example.github.io${BASE}` },
  },
});
