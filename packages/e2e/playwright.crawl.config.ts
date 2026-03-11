/**
 * @module playwright.crawl.config
 * @layer Execution
 *
 * Playwright config for the UI discovery crawler.
 * Separate from the main e2e config — longer timeouts, crawl-specific test dir.
 * Auth strategies (opt-in):
 *   1. Saved storage state (set USE_SAVED_AUTH=true in .env.test)
 *   2. Programmatic Clerk login (set USE_CLERK_AUTH=true in .env.test)
 *   3. No auth (default) — crawls only public/sign-in pages
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

// Only use Clerk global setup when explicitly opted in
const useClerkAuth = process.env.USE_CLERK_AUTH === "true";
const skipGlobalSetup = !useClerkAuth;

// Determine which storage state to use
function resolveStorageState(): string | undefined {
  if (useSavedAuth && fs.existsSync(savedAuthPath)) {
    return savedAuthPath;
  }
  if (fs.existsSync(globalAuthPath)) {
    return globalAuthPath;
  }
  // No storage state available — crawl without auth
  return undefined;
}

// Build projects list conditionally
function buildProjects() {
  const crawlProject = {
    name: "discovery-crawl",
    use: {
      browserName: "chromium" as const,
      ...(resolveStorageState() ? { storageState: resolveStorageState() } : {}),
    },
    ...(skipGlobalSetup ? {} : { dependencies: ["crawl-setup"] }),
  };

  if (skipGlobalSetup) {
    return [crawlProject];
  }

  return [
    {
      name: "crawl-setup",
      testMatch: /global\.setup\.ts/,
      testDir: ".",
      teardown: "crawl-teardown",
    },
    crawlProject,
    {
      name: "crawl-teardown",
      testMatch: /global\.teardown\.ts/,
      testDir: ".",
    },
  ];
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
  projects: buildProjects(),
});
