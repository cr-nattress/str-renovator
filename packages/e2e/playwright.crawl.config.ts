/**
 * @module playwright.crawl.config
 * @layer Execution
 *
 * Playwright config for the UI discovery crawler.
 * Separate from the main e2e config — longer timeouts, crawl-specific test dir.
 * Supports two auth strategies:
 *   1. Programmatic Clerk login (default) via global setup
 *   2. Manually saved storage state (set USE_SAVED_AUTH=true in .env.test)
 */
import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import path from "path";
import fs from "fs";

config({ path: path.resolve(__dirname, ".env.test") });

const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const useSavedAuth = process.env.USE_SAVED_AUTH === "true";
const savedAuthPath = path.resolve(__dirname, "crawl/auth/.auth-state.json");
const globalAuthPath = path.resolve(__dirname, ".playwright/storageState.json");

// Determine which storage state to use
function resolveStorageState(): string {
  if (useSavedAuth && fs.existsSync(savedAuthPath)) {
    return savedAuthPath;
  }
  return globalAuthPath;
}

export default defineConfig({
  testDir: "./crawl",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 300_000, // 5 min per test (crawl can be slow)
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "crawl-setup",
      testMatch: /global\.setup\.ts/,
      testDir: ".",
      teardown: "crawl-teardown",
    },
    {
      name: "discovery-crawl",
      use: {
        browserName: "chromium",
        storageState: resolveStorageState(),
      },
      dependencies: ["crawl-setup"],
    },
    {
      name: "crawl-teardown",
      testMatch: /global\.teardown\.ts/,
      testDir: ".",
    },
  ],
});
