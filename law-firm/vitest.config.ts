import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Load .env (if present) so TEST_DATABASE_URL and APP_SECRET are available.
if (fs.existsSync(".env")) process.loadEnvFile(".env");

const testDb = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside the React server runtime; tests import server modules directly.
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: testDb ?? "",
      APP_SECRET: process.env.APP_SECRET ?? "test-secret-that-is-long-enough-for-hmac-signing",
      STORAGE_DIR: path.resolve(__dirname, "storage-test"),
      MAX_UPLOAD_MB: "2",
    },
  },
});
