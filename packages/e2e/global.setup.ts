import { test as setup, expect } from "@playwright/test";
import { clerkSetup, clerk } from "@clerk/testing/playwright";
import path from "path";
import fs from "fs";

setup("authenticate", async ({ page }) => {
  await clerkSetup();

  const storageDir = path.resolve(__dirname, ".playwright");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
  await page.goto(baseURL);

  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_EMAIL!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });

  // Wait for auth to settle and sidebar to appear
  await expect(page.getByText("STR Renovator")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

  await page.context().storageState({
    path: path.resolve(storageDir, "storageState.json"),
  });
});
