import { mergeTests } from "@playwright/test";
import { authFixture } from "./auth.fixture";
import { screenshotFixture } from "./screenshot.fixture";
import { apiFixture } from "./api.fixture";
import { seedFixture } from "./seed.fixture";

export { type ConsoleErrors } from "./auth.fixture";
export { type ScreenshotHelper } from "./screenshot.fixture";
export { type ApiClient } from "./api.fixture";
export { type SeedData } from "./seed.fixture";

export const test = mergeTests(
  authFixture,
  screenshotFixture,
  apiFixture,
  seedFixture
);

export { expect } from "@playwright/test";
