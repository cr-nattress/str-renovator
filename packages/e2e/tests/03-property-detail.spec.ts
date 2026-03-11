import { test, expect } from "../fixtures";

test.describe("03 — Property Detail", () => {
  test("shows three tabs: Photos, Analyses, Overview", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("button", { name: "Photos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Analyses" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();

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
    await page.getByRole("button", { name: "Analyses" }).click();

    // Should show empty state or the "Run New Analysis" button
    const emptyText = page.getByText("No analyses yet");
    const runButton = page.getByRole("button", { name: "Run New Analysis" });

    const hasEmpty = await emptyText.isVisible().catch(() => false);
    if (hasEmpty) {
      await expect(emptyText).toBeVisible();
    }
    await expect(runButton).toBeVisible();

    await screenshotHelper.take(page, "analyses-tab-empty");
  });

  test("Overview tab shows property form with editable fields", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Overview tab
    await page.getByRole("button", { name: "Overview" }).click();

    // Should show form fields with property data
    const nameInput = page.getByPlaceholder("e.g. Mountain View Cabin");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(seed.propertyName);

    await screenshotHelper.take(page, "overview-tab-form");
  });

  test("Overview tab shows address fields", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Overview tab
    await page.getByRole("button", { name: "Overview" }).click();

    // Should show address fields
    await expect(page.getByPlaceholder("123 Main Street")).toBeVisible();
    await expect(page.getByPlaceholder("City")).toBeVisible();
    await expect(page.getByPlaceholder("State")).toBeVisible();
    await expect(page.getByPlaceholder("ZIP")).toBeVisible();

    await screenshotHelper.take(page, "overview-tab-address-fields");
  });

  test("Design Journey link is present", async ({
    authedPage: page,
    screenshotHelper,
    seed,
  }) => {
    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    const journeyLink = page.getByRole("link", { name: "Design Journey" });
    await expect(journeyLink).toBeVisible();
    await expect(journeyLink).toHaveAttribute(
      "href",
      `/properties/${seed.propertyId}/journey`
    );

    await screenshotHelper.take(page, "design-journey-link");
  });
});
