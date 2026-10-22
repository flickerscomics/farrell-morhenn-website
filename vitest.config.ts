import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  esbuild: { jsx: "automatic" },
  // The unit tests run against sample content, so the real site can change freely.
  test: { include: ["tests/**/*.test.ts"], env: { CONTENT_DIR: "tests/fixtures/content" } },
});
