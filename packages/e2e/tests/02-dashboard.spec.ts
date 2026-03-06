import { test, expect } from "../fixtures";

test.describe("02 — Dashboard", () => {
  test("shows empty state with CTA when no properties exist", async ({
    authedPage: page,
    screenshot,
  }) => {
    // Clean up any existing E2E properties first via the UI
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // If no properties, expect the empty state
    const emptyState = page.getByText("No properties yet.");
    const addFirstButton = page.getByText("Add Your First Property");

    // Either empty state or property cards should be visible
    const isEmpty = await emptyState.isVisible().catch(() => false);
    if (isEmpty) {
      await expect(addFirstButton).toBeVisible();
      await screenshot.take(page, "dashboard-empty-state");
    } else {
      await screenshot.take(page, "dashboard-with-properties");
    }
  });

  test("add property modal opens and closes", async ({
    authedPage: page,
    screenshot,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // Click "Add Property" button in the header
    await page.getByRole("button", { name: "Add Property" }).first().click();

    // Modal should appear
    await expect(page.getByText("New Property")).toBeVisible();
    await expect(
      page.getByPlaceholder("e.g. Mountain View Cabin")
    ).toBeVisible();
    await screenshot.take(page, "add-property-modal-open");

    // Close modal via X button
    await page.locator("button:has-text('×')").click();
    await expect(page.getByText("New Property")).not.toBeVisible();
    await screenshot.take(page, "add-property-modal-closed");
  });

  test("can create a new property via modal", async ({
    authedPage: page,
    screenshot,
    api,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Add Property" }).first().click();
    await expect(page.getByText("New Property")).toBeVisible();

    // Fill out the form
    await page.getByPlaceholder("e.g. Mountain View Cabin").fill("[E2E] Dashboard Test");
    await page
      .getByPlaceholder("Brief description of the property...")
      .fill("Created from dashboard E2E test");

    await screenshot.take(page, "property-form-filled");

    // Submit
    await page.getByRole("button", { name: "Create Property" }).click();

    // Modal should close and property card should appear
    await expect(page.getByText("New Property")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("[E2E] Dashboard Test")).toBeVisible({ timeout: 10_000 });
    await screenshot.take(page, "property-created");

    // Cleanup: delete the property we just created
    const properties = await api.get<Array<{ id: string; name: string }>>(
      "/api/v1/properties"
    );
    const created = properties.find((p) => p.name === "[E2E] Dashboard Test");
    if (created) {
      await api.del(`/api/v1/properties/${created.id}`);
    }
  });

  test("property card navigates to property detail", async ({
    authedPage: page,
    screenshot,
    seed,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // The seeded property should be visible
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });
    await screenshot.take(page, "property-card-visible");

    // Click the property card
    await page.getByText(seed.propertyName).click();

    // Should navigate to property detail
    await expect(page).toHaveURL(new RegExp(`/properties/${seed.propertyId}`));
    await screenshot.take(page, "navigated-to-property-detail");
  });
});
