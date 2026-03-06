import { test as base, type Page, type ConsoleMessage } from "@playwright/test";

export type ConsoleErrors = string[];

/** Collects console errors during test execution */
export const authFixture = base.extend<{
  consoleErrors: ConsoleErrors;
  authedPage: Page;
}>({
  consoleErrors: async ({}, use) => {
    const errors: ConsoleErrors = [];
    await use(errors);
  },

  authedPage: async ({ page, consoleErrors }, use) => {
    const handler = (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out noisy but benign errors
        const ignore = [
          "Failed to load resource",
          "favicon.ico",
          "third-party cookie",
          "clerk",
          "Download the React DevTools",
        ];
        if (!ignore.some((i) => text.toLowerCase().includes(i.toLowerCase()))) {
          consoleErrors.push(text);
        }
      }
    };

    page.on("console", handler);
    await use(page);
    page.off("console", handler);
  },
});
