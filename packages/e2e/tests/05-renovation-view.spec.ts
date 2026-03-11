import { test, expect } from "../fixtures";

const MOCK_ANALYSIS_PHOTO = {
  id: "mock-ap-1",
  analysis_id: "mock-analysis-1",
  photo_id: "mock-photo-1",
  room: "Living Room",
  strengths: ["Natural lighting", "Spacious layout"],
  renovations: "Replace dated furniture. Add accent wall. Upgrade light fixtures.",
  priority: "high",
  report: "The living room has great bones but needs modernization of furnishings and fixtures.",
  created_at: new Date().toISOString(),
  analysis: {
    id: "mock-analysis-1",
    property_id: "mock-prop-1",
  },
  photo: {
    id: "mock-photo-1",
    filename: "living-room.jpg",
    url: "https://placehold.co/800x600",
  },
};

const MOCK_RENOVATIONS = [
  {
    id: "mock-ren-1",
    analysis_photo_id: "mock-ap-1",
    user_id: "mock-user",
    storage_path: "test/renovation-1.jpg",
    url: "https://placehold.co/800x600/blue/white",
    iteration: 1,
    parent_renovation_id: null,
    feedback_context: null,
    status: "completed",
    error: null,
    created_at: new Date().toISOString(),
  },
];

test.describe("05 — Renovation View", () => {

  test.beforeEach(async ({ authedPage: page }) => {
    await page.route("**/api/v1/analysis-photos/*/renovations", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_ANALYSIS_PHOTO,
          renovation_images: MOCK_RENOVATIONS,
        }),
      });
    });

    await page.route("**/api/v1/renovations/*/feedback", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-feedback-1",
          renovation_id: "mock-ren-1",
          rating: "like",
          comment: "Looks great!",
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/renovations/*/rerun", async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ id: "mock-ren-2", status: "pending" }),
      });
    });
  });

  test("shows before/after photo comparison slider", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    await page.goto("/analysis-photos/mock-ap-1/renovations");

    await expect(page.getByText("Before")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("AI Renovated")).toBeVisible();

    await screenshotHelper.take(page, "before-after-slider");
  });

  test("shows renovation details: room name, priority, report", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    await page.goto("/analysis-photos/mock-ap-1/renovations");

    await expect(page.getByRole("heading", { name: "Living Room Renovation" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Suggested Renovations")).toBeVisible();
    await expect(page.getByText("Replace dated furniture")).toBeVisible();

    await screenshotHelper.take(page, "renovation-details");
  });

  test("feedback section: thumbs up/down buttons visible", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    await page.goto("/analysis-photos/mock-ap-1/renovations");
    await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible({ timeout: 10_000 });

    const thumbsUp = page.getByText("\uD83D\uDC4D");
    const thumbsDown = page.getByText("\uD83D\uDC4E");

    await expect(thumbsUp).toBeVisible();
    await expect(thumbsDown).toBeVisible();

    await thumbsUp.click();
    await screenshotHelper.take(page, "thumbs-up-selected");

    await expect(
      page.getByRole("button", { name: "Submit Feedback" })
    ).toBeVisible();
  });

  test("can submit feedback", async ({ authedPage: page, screenshotHelper }) => {
    await page.goto("/analysis-photos/mock-ap-1/renovations");
    await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByText("\uD83D\uDC4D").click();
    const commentBox = page.getByPlaceholder(
      "Optional: add details about what you liked or would change..."
    );
    await commentBox.fill("Looks great! Love the modern touches.");
    await screenshotHelper.take(page, "feedback-form-filled");

    await page.getByRole("button", { name: "Submit Feedback" }).click();

    await expect(page.getByText("Thank you for your feedback!")).toBeVisible({
      timeout: 10_000,
    });
    await screenshotHelper.take(page, "feedback-submitted");
  });

  test("re-run section shows textarea and button", async ({
    authedPage: page,
    screenshotHelper,
  }) => {
    await page.goto("/analysis-photos/mock-ap-1/renovations");

    await expect(page.getByText("Re-run with Feedback")).toBeVisible({
      timeout: 10_000,
    });

    const textarea = page.getByPlaceholder(
      "Describe what you'd like changed in the renovation..."
    );
    await expect(textarea).toBeVisible();

    await textarea.fill("Make the colors warmer and add more wood elements");
    await screenshotHelper.take(page, "rerun-form-filled");

    const rerunButton = page.getByRole("button", { name: "Re-run Renovation" });
    await expect(rerunButton).toBeVisible();
  });
});
