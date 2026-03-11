import { test, expect } from "../fixtures";

// Canned analysis response for mocking "completed" state
const MOCK_COMPLETED_ANALYSIS = {
  id: "mock-analysis-id",
  property_id: "mock-prop",
  user_id: "mock-user",
  status: "completed",
  property_assessment:
    "This is a charming mountain cabin with rustic decor. The property has strong natural lighting and spacious rooms.",
  style_direction:
    "Modern rustic with warm earth tones. Upgrade fixtures while maintaining cabin character.",
  total_photos: 1,
  completed_photos: 1,
  error: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  analysis_photos: [
    {
      id: "mock-ap-1",
      analysis_id: "mock-analysis-id",
      photo_id: "mock-photo-1",
      room: "Living Room",
      strengths: ["Natural lighting", "Spacious layout", "Hardwood floors"],
      renovations:
        "Replace dated furniture with modern pieces. Add accent wall. Upgrade light fixtures.",
      priority: "high",
      report:
        "The living room is the main gathering space. Key improvements include furniture replacement and lighting upgrades.",
      created_at: new Date().toISOString(),
      photos: {
        id: "mock-photo-1",
        filename: "living-room.jpg",
        storage_path: "test/living-room.jpg",
        url: "https://placehold.co/800x600",
      },
    },
  ],
};

const MOCK_ACTION_PLAN = [
  {
    priority: 1,
    item: "Replace living room furniture",
    estimated_cost: "$2,500",
    impact: "high",
    rooms_affected: ["Living Room"],
  },
  {
    priority: 2,
    item: "Paint accent wall",
    estimated_cost: "$300",
    impact: "medium",
    rooms_affected: ["Living Room"],
  },
];

test.describe("04 — Analysis View", () => {
  test("shows progress component for in-progress analysis", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    // Mock an in-progress analysis
    const mockInProgress = {
      ...MOCK_COMPLETED_ANALYSIS,
      status: "analyzing",
      completed_photos: 0,
      property_assessment: null,
      style_direction: null,
      analysis_photos: [],
    };

    await page.route("**/api/v1/analyses/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/stream")) {
        // SSE endpoint — return analyzing status
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "status", status: "analyzing" })}\n\n`,
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockInProgress),
        });
      }
    });

    await page.goto("/analyses/mock-analysis-id");

    await expect(page.getByText("Analysis in Progress")).toBeVisible({
      timeout: 10_000,
    });
    await screenshotHelper.take(page, "analysis-in-progress");
  });

  test("shows SSE live indicator when connected", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    const mockInProgress = {
      ...MOCK_COMPLETED_ANALYSIS,
      status: "analyzing",
      completed_photos: 0,
      property_assessment: null,
      style_direction: null,
      analysis_photos: [],
    };

    await page.route("**/api/v1/analyses/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/stream")) {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "status", status: "analyzing" })}\n\n`,
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockInProgress),
        });
      }
    });

    await page.goto("/analyses/mock-analysis-id");

    await expect(page.getByText("Analysis in Progress")).toBeVisible({
      timeout: 10_000,
    });

    // Check for the Live badge or Connecting status
    const liveIndicator = page.getByText("Live");
    const connectingIndicator = page.getByText("Connecting...");
    const hasLive = await liveIndicator.isVisible().catch(() => false);
    const hasConnecting = await connectingIndicator.isVisible().catch(() => false);

    // One of these should be visible
    expect(hasLive || hasConnecting).toBeTruthy();
    await screenshotHelper.take(page, "sse-indicator");
  });

  test("completed analysis shows assessment and photo cards", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    await page.route("**/api/v1/analyses/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/stream")) {
        await route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_COMPLETED_ANALYSIS),
        });
      }
    });

    await page.goto("/analyses/mock-analysis-id");

    // Property Assessment section
    await expect(page.getByText("Property Assessment")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("charming mountain cabin")).toBeVisible();
    await screenshotHelper.take(page, "completed-assessment");

    // Style Direction
    await expect(page.getByText("Style Direction")).toBeVisible();
    await expect(page.getByText("Modern rustic")).toBeVisible();

    // Photo Analysis section
    await expect(page.getByText("Photo Analysis")).toBeVisible();
    await expect(page.getByText("Living Room")).toBeVisible();
    await screenshotHelper.take(page, "completed-photo-cards");
  });

  test("completed analysis shows action plan table", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    const analysisWithPlan = {
      ...MOCK_COMPLETED_ANALYSIS,
      raw_json: { action_plan: MOCK_ACTION_PLAN },
    };

    await page.route("**/api/v1/analyses/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/stream")) {
        await route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(analysisWithPlan),
        });
      }
    });

    await page.goto("/analyses/mock-analysis-id");

    await expect(page.getByText("Action Plan")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Replace living room furniture")).toBeVisible();
    await expect(page.getByText("Paint accent wall")).toBeVisible();
    await screenshotHelper.take(page, "action-plan-table");
  });
});
