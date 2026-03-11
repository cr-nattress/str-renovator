import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, ".env.test") });

const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "reports/html", open: "never" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "off", // We take manual screenshots via fixture
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "global-setup",
      testMatch: /global\.setup\.ts/,
      testDir: ".",
      teardown: "global-teardown",
    },
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        storageState: path.resolve(__dirname, ".playwright/storageState.json"),
      },
      dependencies: ["global-setup"],
    },
    {
      name: "global-teardown",
      testMatch: /global\.teardown\.ts/,
      testDir: ".",
    },
  ],
});
