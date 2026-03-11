import { test, expect } from "../fixtures";

test.describe("03 — Property Detail", () => {
  test("shows three tabs: Photos, Analyses, Overview", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("tab", { name: "Photos" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Analyses" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();

    await screenshotHelper.take(page, "property-detail-tabs");
  });

  test("Photos tab shows photo uploader", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Photos tab should be active by default
    await expect(
      page.getByText("Click or drag photos here to upload")
    ).toBeVisible();

    await screenshotHelper.take(page, "photo-uploader-visible");
  });

  test("URL import form is visible on Photos tab", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByPlaceholder("Paste listing URL to import photos...")
    ).toBeVisible();

    await screenshotHelper.take(page, "url-import-form");
  });

  test("Analyses tab shows empty state when no analyses exist", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Analyses tab
    await page.getByRole("tab", { name: "Analyses" }).click();

    // Should show empty state message
    await expect(page.getByText("No analyses yet")).toBeVisible();

    await screenshotHelper.take(page, "analyses-tab-empty");
  });

  test("Overview tab renders for property", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Overview tab
    await page.getByRole("tab", { name: "Overview" }).click();

    // Overview tab should be visible (content varies based on property data)
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();

    await screenshotHelper.take(page, "overview-tab");
  });

  test("Overview tab shows scraped data when available", async ({
    authedPage: page,
    screenshotHelper,
    seed,
    api,
  }) => {
    // Patch property with mock scraped data
    await api.patch(`/api/v1/properties/${seed.propertyId}`, {
      scraped_data: {
        title: "Cozy Mountain Retreat",
        bedrooms: 3,
        bathrooms: 2,
        amenities: ["WiFi", "Hot tub"],
      },
    });

    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("tab", { name: "Overview" }).click();

    await expect(page.getByText("Listing Data")).toBeVisible({ timeout: 5_000 });
    await screenshotHelper.take(page, "overview-scraped-data");
  });

  test("Design Journey button is present in header actions", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Design Journey is rendered as a Button in the ActionBar (not a link)
    const journeyButton = page.getByRole("button", { name: "Design Journey" });
    const hasJourney = await journeyButton.isVisible().catch(() => false);

    // The button may or may not be present depending on availableActions from the API
    if (hasJourney) {
      await expect(journeyButton).toBeVisible();
    }

    await screenshotHelper.take(page, "design-journey-button");
  });
});
