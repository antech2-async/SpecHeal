import { defineConfig } from "playwright/test";

export default defineConfig({
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || "/tmp/specheal-test-results",
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false"
  }
});
