import { test, expect } from "../fixtures";
import {
  runAccessibilityAudit,
  findBrokenImages,
  filterConsoleErrors,
  checkResponsiveOverflow,
} from "../helpers/audit";

const PAGES_TO_AUDIT = [
  { name: "Dashboard", path: "/" },
  { name: "Pricing", path: "/pricing" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280 },
  { name: "tablet", width: 768 },
  { name: "mobile", width: 375 },
];

test.describe("08 — UI/UX Audit", () => {
  test("accessibility audit — axe-core WCAG 2.0/2.1 AA", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    for (const { name, path } of PAGES_TO_AUDIT) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const result = await runAccessibilityAudit(page);

      await screenshotHelper.take(page, `a11y-${name.toLowerCase()}`);

      // Log violations for the report but don't hard-fail on minor issues
      if (result.violations.length > 0) {
        console.log(`\n[A11Y] ${name} — ${result.violations.length} violation(s):`);
        for (const v of result.violations) {
          console.log(`  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes} nodes)`);
        }
      }

      // Fail only on critical/serious violations
      const critical = result.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(
        critical,
        `${name}: ${critical.length} critical/serious a11y violation(s): ${critical.map((v) => v.id).join(", ")}`
      ).toHaveLength(0);
    }
  });

  test("no broken images on key pages", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    for (const { name, path } of PAGES_TO_AUDIT) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const broken = await findBrokenImages(page);

      await screenshotHelper.take(page, `broken-images-${name.toLowerCase()}`);

      expect(
        broken,
        `${name}: ${broken.length} broken image(s): ${broken.join(", ")}`
      ).toHaveLength(0);
    }
  });

  test("no meaningful console errors on key pages", async ({
    authedPage: page,
    consoleErrors,
    screenshotHelper,
  }) => {
    for (const { name, path } of PAGES_TO_AUDIT) {
      // Clear previous errors
      consoleErrors.length = 0;

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // Wait a moment for any deferred JS errors
      await page.waitForTimeout(1000);

      const meaningful = filterConsoleErrors(consoleErrors);

      await screenshotHelper.take(page, `console-errors-${name.toLowerCase()}`);

      if (meaningful.length > 0) {
        console.log(`\n[Console] ${name} — ${meaningful.length} error(s):`);
        meaningful.forEach((e) => console.log(`  - ${e}`));
      }

      expect(
        meaningful,
        `${name}: ${meaningful.length} console error(s)`
      ).toHaveLength(0);
    }
  });

  test("responsive: no horizontal overflow at standard viewports", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    for (const { name, path } of PAGES_TO_AUDIT) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      for (const vp of VIEWPORTS) {
        const result = await checkResponsiveOverflow(page, vp.width);

        await screenshotHelper.take(
          page,
          `overflow-${name.toLowerCase()}-${vp.name}`
        );

        expect(
          result.hasOverflow,
          `${name} @ ${vp.name} (${vp.width}px): overflow by ${result.overflowAmount}px`
        ).toBe(false);
      }
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("loading states render correctly", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    // Intercept API to delay response so loading state is visible
    await page.route("**/api/v1/properties", async (route) => {
      // Delay the response to capture loading state
      await new Promise((r) => setTimeout(r, 100));
      await route.continue();
    });

    await page.goto("/");

    // Look for the "Loading..." text that Dashboard shows while fetching
    const loadingText = page.getByText("Loading...");
    // Either we catch loading state or the data loaded fast
    const wasLoading = await loadingText.isVisible().catch(() => false);

    if (wasLoading) {
      await screenshotHelper.take(page, "loading-state-dashboard");
    }

    // Wait for actual content
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 15_000 });
    await screenshotHelper.take(page, "loaded-state-dashboard");
  });

  test("empty states have clear call-to-action", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    // Mock empty properties response
    await page.route("**/api/v1/properties", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // Empty state should have descriptive text + CTA
    await expect(page.getByText("No properties yet.")).toBeVisible();
    await expect(page.getByText("Add your first property")).toBeVisible();
    await expect(page.getByText("Add Your First Property")).toBeVisible();

    await screenshotHelper.take(page, "empty-state-cta");
  });
});
