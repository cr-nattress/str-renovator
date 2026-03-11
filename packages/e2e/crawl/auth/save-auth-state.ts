/**
 * @module save-auth-state
 * @layer Execution
 *
 * Opens a headed Chromium browser pointed at the app.
 * User logs in manually via Clerk. Once authenticated,
 * the script saves browser storage state to .auth-state.json
 * for reuse by the discovery crawler.
 *
 * Usage: npx tsx crawl/auth/save-auth-state.ts
 */
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../../.env.test") });

const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const outputPath = path.resolve(__dirname, ".auth-state.json");

async function saveAuthState(): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log(`\nNavigating to ${baseURL}`);
  console.log("Please log in manually via Clerk.\n");
  console.log("Once you see the dashboard, press Enter in this terminal to save auth state.\n");

  await page.goto(baseURL);

  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Verify auth by checking for sidebar
  const sidebarVisible = await page.getByText("STR Renovator").isVisible().catch(() => false);
  if (!sidebarVisible) {
    console.error("Warning: 'STR Renovator' sidebar text not found. Auth may not be complete.");
  }

  await context.storageState({ path: outputPath });
  console.log(`Auth state saved to ${outputPath}`);

  await browser.close();
  process.exit(0);
}

saveAuthState().catch((err) => {
  console.error("Failed to save auth state:", err);
  process.exit(1);
});
