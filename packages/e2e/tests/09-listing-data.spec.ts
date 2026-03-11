import { test, expect } from "../fixtures";

test.describe("09 — Listing Data & Location Profile", () => {
  test("scraped data display renders when property has scraped_data", async ({
    authedPage: page,
    api,
    seed,
    screenshotHelper,
  }) => {
    // Patch property with mock scraped data
    await api.patch(`/api/v1/properties/${seed.propertyId}`, {
      scraped_data: {
        title: "Cozy Mountain Retreat",
        bedrooms: 3,
        bathrooms: 2,
        amenities: ["WiFi", "Hot tub", "Mountain view"],
        property_type: "Entire home",
      },
    });

    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Overview tab
    await page.getByRole("tab", { name: "Overview" }).click();

    // Scraped data card should be visible
    await expect(page.getByText("Listing Data")).toBeVisible();
    await expect(page.getByText("Cozy Mountain Retreat")).toBeVisible();

    await screenshotHelper.take(page, "scraped-data-display");
  });

  test("location profile display renders when property has location_profile", async ({
    authedPage: page,
    api,
    seed,
    screenshotHelper,
  }) => {
    // Patch property with mock location profile
    await api.patch(`/api/v1/properties/${seed.propertyId}`, {
      location_profile: {
        area_type: "mountain",
        area_bio: "A charming mountain town nestled in the Blue Ridge.",
        guest_demographics: ["Couples", "Families with children"],
        design_recommendations: ["Use natural wood tones", "Add cozy textiles"],
      },
    });

    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Overview tab
    await page.getByRole("tab", { name: "Overview" }).click();

    // Location profile card should be visible
    await expect(page.getByText("Location Profile")).toBeVisible();
    await expect(page.getByText("mountain", { exact: true })).toBeVisible();
    await expect(page.getByText("A charming mountain town")).toBeVisible();
    await expect(page.getByText("Refresh")).toBeVisible();

    await screenshotHelper.take(page, "location-profile-display");
  });

  test("research location button appears when city/state present but no profile", async ({
    authedPage: page,
    api,
    seed,
    screenshotHelper,
  }) => {
    // Patch property with city/state but no location profile
    await api.patch(`/api/v1/properties/${seed.propertyId}`, {
      city: "Asheville",
      state: "NC",
    });

    await page.goto(`/properties/${seed.propertyId}`);
    await expect(page.getByText(seed.propertyName)).toBeVisible({ timeout: 10_000 });

    // Switch to Overview tab
    await page.getByRole("tab", { name: "Overview" }).click();

    // Research Location button should be visible
    await expect(
      page.getByRole("button", { name: "Research Location" })
    ).toBeVisible();

    await screenshotHelper.take(page, "research-location-button");
  });
});
