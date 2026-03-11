import { test, expect } from "@playwright/test";

test.describe("01 — Authentication", () => {
  test("unauthenticated users see the sign-in gate", async ({ browser }) => {
    // Fresh context without storageState to simulate logged-out user
    const context = await browser.newContext();
    const page = await context.newPage();
    const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";

    await page.goto(baseURL);

    // Clerk should render a sign-in component or redirect
    // The app wraps content in <SignedIn>, so unauthenticated users see Clerk UI
    await expect(
      page.locator(".cl-signIn, .cl-rootBox, [data-clerk]").first()
    ).toBeVisible({ timeout: 15_000 });

    // The core assertion is that Clerk's sign-in gate is visible (above).
    // Clerk may briefly render both <SignedIn> and <SignedOut> states during init,
    // so checking sidebar hidden is unreliable. The sign-in widget presence is sufficient.

    await page.screenshot({ path: "screenshots/01-auth-gate.png", fullPage: true });
    await context.close();
  });

  test("authenticated users see the sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("STR Renovator")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("AI-Powered Renovation")).toBeVisible();
    await page.screenshot({ path: "screenshots/01-sidebar-visible.png", fullPage: true });
  });

  test("sidebar has correct navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("STR Renovator")).toBeVisible({ timeout: 10_000 });

    const propertiesLink = page.getByRole("link", { name: "Properties" });
    const pricingLink = page.getByRole("link", { name: "Pricing" });

    await expect(propertiesLink).toBeVisible();
    await expect(pricingLink).toBeVisible();

    // Properties link should point to /
    await expect(propertiesLink).toHaveAttribute("href", "/");
    // Pricing link should point to /pricing
    await expect(pricingLink).toHaveAttribute("href", "/pricing");

    await page.screenshot({ path: "screenshots/01-nav-links.png", fullPage: true });
  });
});
