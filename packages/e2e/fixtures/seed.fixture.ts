import { test as base, type Page } from "@playwright/test";
import { MOCK_JPEG_BUFFER, MOCK_JPEG_FILENAME } from "../helpers/mock-photo";

export interface SeedData {
  propertyId: string;
  propertyName: string;
  photoIds: string[];
}

export const seedFixture = base.extend<{
  seed: SeedData;
}>({
  seed: async ({ page }, use) => {
    const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

    async function getToken(page: Page): Promise<string> {
      return page.evaluate(async () => {
        const w = window as unknown as {
          Clerk?: { session?: { getToken: () => Promise<string> } };
        };
        if (!w.Clerk?.session) throw new Error("Clerk session not available");
        return w.Clerk.session.getToken();
      });
    }

    // Navigate to app so Clerk is loaded
    const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
    await page.goto(baseURL);
    await page.waitForSelector("text=STR Renovator", { timeout: 15_000 });

    const token = await getToken(page);

    // Clean up any leftover E2E properties first
    const existingRes = await fetch(`${apiURL}/api/v1/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (existingRes.ok) {
      const existing: Array<{ id: string; name: string }> =
        await existingRes.json();
      for (const prop of existing) {
        if (prop.name.startsWith("[E2E]")) {
          await fetch(`${apiURL}/api/v1/properties/${prop.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    }

    // Create test property
    const propRes = await fetch(`${apiURL}/api/v1/properties`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "[E2E] Test Property",
        description: "Automated test property",
        listing_url: "https://example.com/test-listing",
        context: "E2E test context",
      }),
    });

    if (!propRes.ok) {
      throw new Error(`Failed to create test property: ${propRes.status}`);
    }

    const property: { id: string; name: string } = await propRes.json();

    // Upload a test photo
    const formData = new FormData();
    const blob = new Blob(
      [Uint8Array.from(MOCK_JPEG_BUFFER)],
      { type: "image/jpeg" }
    );
    formData.append("photos", blob, MOCK_JPEG_FILENAME);

    const photoRes = await fetch(
      `${apiURL}/api/v1/properties/${property.id}/photos`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    const photoIds: string[] = [];
    if (photoRes.ok) {
      const photos: Array<{ id: string }> = await photoRes.json();
      photoIds.push(...photos.map((p) => p.id));
    }

    const seedData: SeedData = {
      propertyId: property.id,
      propertyName: property.name,
      photoIds,
    };

    await use(seedData);

    // Cleanup: delete the test property (cascades to photos, analyses, etc.)
    const cleanupToken = await getToken(page).catch(() => token);
    await fetch(`${apiURL}/api/v1/properties/${property.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${cleanupToken}` },
    }).catch(() => {});
  },
});
