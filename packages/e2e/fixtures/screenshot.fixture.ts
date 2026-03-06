import { test as base, type TestInfo, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

export interface ScreenshotHelper {
  take(page: Page, step: string): Promise<void>;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

export const screenshotFixture = base.extend<{
  screenshot: ScreenshotHelper;
}>({
  screenshot: async ({}, use, testInfo: TestInfo) => {
    const suiteName = path.basename(testInfo.file, ".spec.ts");
    const testSlug = testInfo.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const dir = path.resolve(
      __dirname,
      "..",
      "screenshots",
      timestamp,
      suiteName,
      testSlug
    );

    let stepIndex = 0;

    const helper: ScreenshotHelper = {
      async take(page: Page, step: string) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const stepSlug = step
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const filename = `${String(stepIndex).padStart(2, "0")}-${stepSlug}.png`;
        stepIndex++;

        const buffer = await page.screenshot({
          fullPage: true,
          path: path.join(dir, filename),
        });

        await testInfo.attach(step, {
          body: buffer,
          contentType: "image/png",
        });
      },
    };

    await use(helper);
  },
});
