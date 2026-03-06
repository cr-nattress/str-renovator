import { test, expect } from "../fixtures";

test.describe("07 — Pricing", () => {
  test("shows three pricing tiers", async ({ authedPage: page, screenshot }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Pricing Plans")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business" })).toBeVisible();

    await screenshot.take(page, "three-tiers");
  });

  test("displays correct prices", async ({ authedPage: page, screenshot }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Pricing Plans")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("$0")).toBeVisible();
    await expect(page.getByText("$29/mo")).toBeVisible();
    await expect(page.getByText("$99/mo")).toBeVisible();

    await screenshot.take(page, "tier-prices");
  });

  test("feature rows are visible for each tier", async ({
    authedPage: page,
    screenshot,
  }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Pricing Plans")).toBeVisible({ timeout: 10_000 });

    // Feature labels
    await expect(page.getByText("Properties").first()).toBeVisible();
    await expect(page.getByText("Photos per Property").first()).toBeVisible();
    await expect(page.getByText("Analyses per Month").first()).toBeVisible();
    await expect(page.getByText("Re-runs per Photo").first()).toBeVisible();
    await expect(page.getByText("Image Quality").first()).toBeVisible();
    await expect(page.getByText("URL Scraping").first()).toBeVisible();

    await screenshot.take(page, "feature-rows");
  });

  test("Pro tier is highlighted as most popular", async ({
    authedPage: page,
    screenshot,
  }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Pricing Plans")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Most Popular")).toBeVisible();
    await screenshot.take(page, "pro-highlighted");
  });

  test("responsive: tiers stack on mobile viewport", async ({
    authedPage: page,
    screenshot,
  }) => {
    await page.goto("/pricing");
    await expect(page.getByText("Pricing Plans")).toBeVisible({ timeout: 10_000 });

    // Desktop screenshot
    await page.setViewportSize({ width: 1280, height: 800 });
    await screenshot.take(page, "pricing-desktop");

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await screenshot.take(page, "pricing-tablet");

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);

    // All three tier headings should still be visible on mobile
    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business" })).toBeVisible();

    await screenshot.take(page, "pricing-mobile");

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });
});
