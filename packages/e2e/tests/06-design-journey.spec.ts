import { test, expect } from "../fixtures";

const MOCK_JOURNEY_ITEMS = [
  {
    id: "j1",
    property_id: "mock-prop",
    analysis_id: "mock-analysis",
    user_id: "mock-user",
    priority: 1,
    title: "Replace living room furniture",
    description: "Swap dated sofa and chairs for modern pieces",
    estimated_cost: 2500,
    actual_cost: null,
    impact: "high",
    rooms_affected: ["Living Room"],
    status: "not_started",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "j2",
    property_id: "mock-prop",
    analysis_id: "mock-analysis",
    user_id: "mock-user",
    priority: 2,
    title: "Paint accent wall",
    description: "Add a warm earth-tone accent wall",
    estimated_cost: 300,
    actual_cost: 250,
    impact: "medium",
    rooms_affected: ["Living Room"],
    status: "in_progress",
    notes: "Selected Benjamin Moore color",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "j3",
    property_id: "mock-prop",
    analysis_id: "mock-analysis",
    user_id: "mock-user",
    priority: 3,
    title: "Upgrade light fixtures",
    description: "Replace builder-grade fixtures with modern options",
    estimated_cost: 800,
    actual_cost: 750,
    impact: "medium",
    rooms_affected: ["Living Room", "Kitchen"],
    status: "completed",
    notes: "Installed pendant lights",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_SUMMARY = {
  total_items: 3,
  total_estimated: 3600,
  total_actual: 1000,
  by_status: {
    not_started: 1,
    in_progress: 1,
    completed: 1,
    skipped: 0,
  },
};

test.describe("06 — Design Journey", () => {
  test("shows empty state when no journey items", async ({
    authedPage: page,
    screenshot,
    seed,
  }) => {
    await page.route(`**/api/v1/properties/${seed.propertyId}/journey`, async (route) => {
      if (route.request().url().includes("/summary")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ total_items: 0, total_estimated: 0, total_actual: 0, by_status: {} }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto(`/properties/${seed.propertyId}/journey`);

    await expect(page.getByText("Design Journey")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("No journey items yet.")).toBeVisible();
    await screenshot.take(page, "journey-empty-state");
  });

  test("shows kanban sections grouped by status", async ({
    authedPage: page,
    screenshot,
    seed,
  }) => {
    await page.route(`**/api/v1/properties/${seed.propertyId}/journey`, async (route) => {
      if (route.request().url().includes("/summary")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_SUMMARY),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_JOURNEY_ITEMS),
        });
      }
    });

    await page.goto(`/properties/${seed.propertyId}/journey`);
    await expect(page.getByText("Design Journey")).toBeVisible({ timeout: 10_000 });

    // Check status sections
    await expect(page.getByText(/Not Started/)).toBeVisible();
    await expect(page.getByText(/In Progress/)).toBeVisible();
    await expect(page.getByText(/Completed/)).toBeVisible();

    await screenshot.take(page, "journey-kanban-sections");
  });

  test("shows budget tracker with estimated and actual costs", async ({
    authedPage: page,
    screenshot,
    seed,
  }) => {
    await page.route(`**/api/v1/properties/${seed.propertyId}/journey`, async (route) => {
      if (route.request().url().includes("/summary")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_SUMMARY),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_JOURNEY_ITEMS),
        });
      }
    });

    await page.goto(`/properties/${seed.propertyId}/journey`);
    await expect(page.getByText("Budget")).toBeVisible({ timeout: 10_000 });

    // Budget tracker shows estimated and actual
    await expect(page.getByText("Estimated")).toBeVisible();
    await expect(page.getByText("Actual")).toBeVisible();

    await screenshot.take(page, "budget-tracker");
  });

  test("action item card shows status dropdown", async ({
    authedPage: page,
    screenshot,
    seed,
  }) => {
    await page.route(`**/api/v1/properties/${seed.propertyId}/journey`, async (route) => {
      if (route.request().url().includes("/summary")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_SUMMARY),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_JOURNEY_ITEMS),
        });
      }
    });

    await page.route("**/api/v1/journey/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_JOURNEY_ITEMS[0], status: "in_progress" }),
      });
    });

    await page.goto(`/properties/${seed.propertyId}/journey`);
    await expect(page.getByText("Replace living room furniture")).toBeVisible({
      timeout: 10_000,
    });

    // Find the status select for the first item
    const statusSelect = page.locator("select").first();
    await expect(statusSelect).toBeVisible();

    // Change status
    await statusSelect.selectOption("in_progress");
    await screenshot.take(page, "status-dropdown-changed");

    // Save button should appear when dirty
    const saveButton = page.getByRole("button", { name: "Save Changes" }).first();
    const hasSave = await saveButton.isVisible().catch(() => false);
    if (hasSave) {
      await screenshot.take(page, "save-changes-button");
    }
  });
});
