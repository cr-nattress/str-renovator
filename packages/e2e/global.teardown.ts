import { test as teardown } from "@playwright/test";

teardown("cleanup E2E data", async ({ request }) => {
  const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

  // We need a valid JWT to call the API. Since teardown runs without
  // browser context, we skip cleanup if no token is available.
  // The seed fixture handles per-test cleanup, and the next run's
  // seed will clean up any leftover [E2E] data.
  try {
    const res = await request.get(`${apiURL}/api/v1/properties`);
    if (!res.ok()) return;

    const properties: Array<{ id: string; name: string }> = await res.json();

    for (const prop of properties) {
      if (prop.name.startsWith("[E2E]")) {
        await request.delete(`${apiURL}/api/v1/properties/${prop.id}`);
      }
    }
  } catch {
    // Teardown is best-effort — don't fail the suite
  }
});
