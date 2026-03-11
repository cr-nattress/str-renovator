import { test, expect } from "../fixtures";

test.describe("02 — Dashboard", () => {
  test("shows empty state with CTA when no properties exist", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    // Clean up any existing E2E properties first via the UI
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // If no properties, expect the empty state
    const emptyState = page.getByText("Ready to transform your first property?");
    const addFirstButton = page.getByText("Add Your First Property");

    // Either empty state or property cards should be visible
    const isEmpty = await emptyState.isVisible().catch(() => false);
    if (isEmpty) {
      await expect(addFirstButton).toBeVisible();
      await screenshotHelper.take(page, "dashboard-empty-state");
    } else {
      await screenshotHelper.take(page, "dashboard-with-properties");
    }
  });

  test("add property modal opens and closes", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // Click "Add Property" button in the header
    await page.getByRole("button", { name: "Add Property" }).first().click();

    // Modal should appear with "Add Property" title (intent box mode)
    await expect(page.getByText("Add Property").first()).toBeVisible();
    await expect(
      page.getByPlaceholder("Paste a listing URL or type a property name...")
    ).toBeVisible();
    await screenshotHelper.take(page, "add-property-modal-open");

    // Close modal via X button (sr-only "Close" label)
    await page.getByRole("button", { name: "Close" }).click();
    await expect(
      page.getByPlaceholder("Paste a listing URL or type a property name...")
    ).not.toBeVisible();
    await screenshotHelper.take(page, "add-property-modal-closed");
  });

  test("can create a new property via modal", async ({
    authedPage: page,
    screenshotHelper,
    api,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Add Property" }).first().click();

    // Intent box: type a property name and submit
    await page.getByPlaceholder("Paste a listing URL or type a property name...").fill("[E2E] Dashboard Test");

    await screenshotHelper.take(page, "property-intent-filled");

    // Submit via "Create Property" button
    await page.getByRole("button", { name: "Create Property" }).click();

    // Should navigate to the new property detail page
    await expect(page).toHaveURL(/\/properties\//, { timeout: 10_000 });
    await screenshotHelper.take(page, "property-created");

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
    screenshotHelper,
    seed,
  }) => {
    await page.goto("/");
    await expect(page.getByText("Your Properties")).toBeVisible({ timeout: 10_000 });

    // The seeded property should be visible
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });
    await screenshotHelper.take(page, "property-card-visible");

    // Click the property card
    await page.getByText(seed.propertyName).click();

    // Should navigate to property detail
    await expect(page).toHaveURL(new RegExp(`/properties/${seed.propertyId}`));
    await screenshotHelper.take(page, "navigated-to-property-detail");
  });
});
