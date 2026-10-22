import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

const PORT = 3100;
const e2eDb = process.env.E2E_DATABASE_URL;
if (!e2eDb) throw new Error("Set E2E_DATABASE_URL (a disposable database) to run the end-to-end tests.");

// Runs against the production build: `npm run build` first, then `npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDb,
      SITE_URL: `http://localhost:${PORT}`,
      STORAGE_DIR: "./storage-e2e",
      APP_SECRET: process.env.APP_SECRET ?? "e2e-secret-value-that-is-long-enough-123456",
      INSECURE_COOKIES: "true",
    },
  },
});
