# UI Discovery Crawler + LLM Error Analyzer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Playwright-based UI crawler that dynamically discovers and visits every page in the app, records all console/network/DOM errors, then uses Claude API to analyze each error against the source code and produce a prioritized fix queue.

**Architecture:** Extends the existing `packages/e2e/` Playwright infrastructure. A new `crawl/` test directory contains the discovery crawler (separate from numbered spec files). Auth reuses the existing Clerk global setup (programmatic login) with a fallback to manually-saved storage state. Post-crawl, a Node script reads the error logs, maps errors to source files, sends context to Claude API, and writes enriched `logs/analyzed/` output. A persistent `sitemap.json` tracks discovered routes across runs.

**Tech Stack:** Playwright 1.49, @clerk/testing, Claude API (@anthropic-ai/sdk), Node.js, TypeScript

---

## Task 1: Add Anthropic SDK dependency and crawl config

**Files:**
- Modify: `packages/e2e/package.json`
- Create: `packages/e2e/crawl.config.json`

**Step 1: Add @anthropic-ai/sdk to e2e package**

Add the Anthropic SDK as a dev dependency:

```bash
cd packages/e2e && npm install --save-dev @anthropic-ai/sdk
```

**Step 2: Create crawl.config.json**

Create `packages/e2e/crawl.config.json`:

```json
{
  "baseURL": "http://localhost:5173",
  "pageTimeout": 60000,
  "networkIdleTimeout": 5000,
  "maxDepth": 5,
  "excludePatterns": [
    "^https?://",
    "^mailto:",
    "^tel:",
    "^javascript:",
    "#"
  ],
  "excludeHosts": [],
  "screenshotOnError": true
}
```

**Step 3: Add ANTHROPIC_API_KEY to .env.test.example**

Modify `packages/e2e/.env.test.example` — append:

```
# LLM error analysis (post-crawl)
ANTHROPIC_API_KEY=sk-ant-...
```

**Step 4: Add crawl scripts to package.json**

Modify `packages/e2e/package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report reports/html",
    "crawl": "playwright test --config playwright.crawl.config.ts",
    "crawl:headed": "playwright test --config playwright.crawl.config.ts --headed",
    "crawl:analyze": "tsx crawl/analyze/analyze-errors.ts",
    "crawl:full": "npm run crawl && npm run crawl:analyze"
  }
}
```

**Step 5: Add tsx as dev dependency for the analyze script**

```bash
cd packages/e2e && npm install --save-dev tsx
```

**Step 6: Commit**

```bash
git add packages/e2e/package.json packages/e2e/crawl.config.json packages/e2e/.env.test.example
git commit -m "feat(e2e): add crawl config, anthropic SDK, and crawl scripts"
```

---

## Task 2: Create crawl-specific Playwright config

**Files:**
- Create: `packages/e2e/playwright.crawl.config.ts`

**Step 1: Create the crawl Playwright config**

This config is separate from the main e2e config. It points at the `crawl/` test directory, uses longer timeouts, and supports both auth strategies.

Create `packages/e2e/playwright.crawl.config.ts`:

```typescript
/**
 * @module playwright.crawl.config
 * @layer Execution
 *
 * Playwright config for the UI discovery crawler.
 * Separate from the main e2e config — longer timeouts, crawl-specific test dir.
 * Supports two auth strategies:
 *   1. Programmatic Clerk login (default) via global setup
 *   2. Manually saved storage state (set USE_SAVED_AUTH=true in .env.test)
 */
import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import path from "path";
import fs from "fs";

config({ path: path.resolve(__dirname, ".env.test") });

const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const useSavedAuth = process.env.USE_SAVED_AUTH === "true";
const savedAuthPath = path.resolve(__dirname, "crawl/auth/.auth-state.json");
const globalAuthPath = path.resolve(__dirname, ".playwright/storageState.json");

// Determine which storage state to use
function resolveStorageState(): string {
  if (useSavedAuth && fs.existsSync(savedAuthPath)) {
    return savedAuthPath;
  }
  return globalAuthPath;
}

export default defineConfig({
  testDir: "./crawl",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 300_000, // 5 min per test (crawl can be slow)
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "off",
    video: "off",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "crawl-setup",
      testMatch: /global\.setup\.ts/,
      testDir: ".",
      teardown: "crawl-teardown",
    },
    {
      name: "discovery-crawl",
      use: {
        browserName: "chromium",
        storageState: resolveStorageState(),
      },
      dependencies: ["crawl-setup"],
    },
    {
      name: "crawl-teardown",
      testMatch: /global\.teardown\.ts/,
      testDir: ".",
    },
  ],
});
```

**Step 2: Run to verify config loads**

```bash
cd packages/e2e && npx playwright test --config playwright.crawl.config.ts --list
```

Expected: no tests found yet (empty crawl/ dir), but config loads without errors.

**Step 3: Commit**

```bash
git add packages/e2e/playwright.crawl.config.ts
git commit -m "feat(e2e): add crawl-specific Playwright config with dual auth support"
```

---

## Task 3: Create the manual auth state saver script

**Files:**
- Create: `packages/e2e/crawl/auth/save-auth-state.ts`

**Step 1: Create the save-auth-state script**

This opens a headed browser for manual login and saves the storage state. Used as fallback when programmatic login isn't available or is broken.

Create `packages/e2e/crawl/auth/save-auth-state.ts`:

```typescript
/**
 * @module save-auth-state
 * @layer Execution
 *
 * Opens a headed Chromium browser pointed at the app.
 * User logs in manually via Clerk. Once authenticated,
 * the script saves browser storage state to .auth-state.json
 * for reuse by the discovery crawler.
 *
 * Usage: npx tsx crawl/auth/save-auth-state.ts
 */
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import path from "path";
import fs from "fs";

config({ path: path.resolve(__dirname, "../../.env.test") });

const baseURL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const outputPath = path.resolve(__dirname, ".auth-state.json");

async function saveAuthState(): Promise<void> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\nNavigating to ${baseURL}`);
  console.log("Please log in manually via Clerk.\n");
  console.log("Once you see the dashboard, press Enter in this terminal to save auth state.\n");

  await page.goto(baseURL);

  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Verify auth by checking for sidebar
  const sidebarVisible = await page.getByText("STR Renovator").isVisible().catch(() => false);
  if (!sidebarVisible) {
    console.error("Warning: 'STR Renovator' sidebar text not found. Auth may not be complete.");
  }

  await context.storageState({ path: outputPath });
  console.log(`Auth state saved to ${outputPath}`);

  await browser.close();
  process.exit(0);
}

saveAuthState().catch((err) => {
  console.error("Failed to save auth state:", err);
  process.exit(1);
});
```

**Step 2: Add .auth-state.json to .gitignore**

Append to `packages/e2e/.gitignore` (create if needed):

```
# Saved auth state for manual login fallback
crawl/auth/.auth-state.json
```

**Step 3: Add script shortcut to package.json**

Add to `packages/e2e/package.json` scripts:

```json
"crawl:save-auth": "tsx crawl/auth/save-auth-state.ts"
```

**Step 4: Commit**

```bash
git add packages/e2e/crawl/auth/save-auth-state.ts packages/e2e/package.json
git commit -m "feat(e2e): add manual auth state saver for crawl fallback"
```

---

## Task 4: Create the error collector module

**Files:**
- Create: `packages/e2e/crawl/error-collector.ts`

**Step 1: Write the error collector**

This module attaches to a Playwright page and collects console errors, network failures, and uncaught exceptions. Each error is tagged with page URL and timestamp.

Create `packages/e2e/crawl/error-collector.ts`:

```typescript
/**
 * @module error-collector
 * @layer Execution
 *
 * Attaches to a Playwright Page and collects:
 *  - Console errors and warnings
 *  - Failed network requests (4xx, 5xx, network errors)
 *  - Uncaught page exceptions
 *
 * Each error gets a unique ID, timestamp, page URL, and category.
 * Call attach() before navigating, detach() when done with a page.
 *
 * Does NOT handle: broken images, empty pages (those are checked separately
 * by the crawler after page load via DOM inspection).
 */
import type { Page, ConsoleMessage, Request, Response } from "@playwright/test";
import { randomUUID } from "crypto";

export type ErrorSeverity = "error" | "warning" | "info";
export type ErrorCategory =
  | "console-error"
  | "console-warning"
  | "network-error"
  | "network-4xx"
  | "network-5xx"
  | "uncaught-exception"
  | "broken-image"
  | "empty-page";

export interface CrawlError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  page: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export class ErrorCollector {
  private errors: CrawlError[] = [];
  private page: Page | null = null;
  private consoleHandler: ((msg: ConsoleMessage) => void) | null = null;
  private requestFailedHandler: ((req: Request) => void) | null = null;
  private responseHandler: ((res: Response) => void) | null = null;
  private pageErrorHandler: ((err: Error) => void) | null = null;

  /**
   * Attach listeners to a page. Call before navigating.
   */
  attach(page: Page): void {
    this.page = page;

    this.consoleHandler = (msg: ConsoleMessage) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        const text = msg.text();
        // Skip noisy/benign browser messages
        const ignore = [
          "favicon.ico",
          "third-party cookie",
          "Download the React DevTools",
        ];
        if (ignore.some((i) => text.toLowerCase().includes(i.toLowerCase()))) return;

        this.addError({
          category: type === "error" ? "console-error" : "console-warning",
          severity: type === "error" ? "error" : "warning",
          message: text,
          details: {
            location: msg.location(),
            args: msg.args().length,
          },
        });
      }
    };

    this.requestFailedHandler = (req: Request) => {
      this.addError({
        category: "network-error",
        severity: "error",
        message: `Network request failed: ${req.url()}`,
        details: {
          method: req.method(),
          url: req.url(),
          resourceType: req.resourceType(),
          failure: req.failure()?.errorText ?? "unknown",
        },
      });
    };

    this.responseHandler = (res: Response) => {
      const status = res.status();
      if (status >= 400) {
        const category: ErrorCategory = status >= 500 ? "network-5xx" : "network-4xx";
        const severity: ErrorSeverity = status >= 500 ? "error" : "warning";
        this.addError({
          category,
          severity,
          message: `HTTP ${status} ${res.statusText()}: ${res.url()}`,
          details: {
            method: res.request().method(),
            url: res.url(),
            status,
            statusText: res.statusText(),
            resourceType: res.request().resourceType(),
          },
        });
      }
    };

    this.pageErrorHandler = (err: Error) => {
      this.addError({
        category: "uncaught-exception",
        severity: "error",
        message: err.message,
        details: {
          name: err.name,
          stack: err.stack ?? "",
        },
      });
    };

    page.on("console", this.consoleHandler);
    page.on("requestfailed", this.requestFailedHandler);
    page.on("response", this.responseHandler);
    page.on("pageerror", this.pageErrorHandler);
  }

  /**
   * Remove all listeners from the current page.
   */
  detach(): void {
    if (!this.page) return;
    if (this.consoleHandler) this.page.off("console", this.consoleHandler);
    if (this.requestFailedHandler) this.page.off("requestfailed", this.requestFailedHandler);
    if (this.responseHandler) this.page.off("response", this.responseHandler);
    if (this.pageErrorHandler) this.page.off("pageerror", this.pageErrorHandler);
    this.page = null;
  }

  /**
   * Check the current page DOM for broken images and empty content.
   * Call after page has loaded and settled.
   */
  async checkDom(page: Page): Promise<void> {
    // Broken images: <img> elements that failed to load
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0 && img.src)
        .map((img) => ({ src: img.src, alt: img.alt }));
    });

    for (const img of brokenImages) {
      this.addError({
        category: "broken-image",
        severity: "warning",
        message: `Broken image: ${img.src}`,
        details: { src: img.src, alt: img.alt },
      });
    }

    // Empty page: no meaningful content in main area
    const isEmpty = await page.evaluate(() => {
      const main = document.querySelector("main") ?? document.body;
      const text = main.innerText?.trim() ?? "";
      // Less than 20 chars of visible text likely means empty/broken page
      return text.length < 20;
    });

    if (isEmpty) {
      this.addError({
        category: "empty-page",
        severity: "warning",
        message: "Page appears empty or has minimal content",
        details: {},
      });
    }
  }

  getErrors(): CrawlError[] {
    return [...this.errors];
  }

  getErrorsByCategory(category: ErrorCategory): CrawlError[] {
    return this.errors.filter((e) => e.category === category);
  }

  clear(): void {
    this.errors = [];
  }

  private addError(
    partial: Omit<CrawlError, "id" | "page" | "timestamp">
  ): void {
    this.errors.push({
      id: randomUUID(),
      page: this.page?.url() ?? "unknown",
      timestamp: new Date().toISOString(),
      ...partial,
    });
  }
}
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/error-collector.ts
git commit -m "feat(e2e): add error collector for console, network, and DOM errors"
```

---

## Task 5: Create the link discovery module

**Files:**
- Create: `packages/e2e/crawl/link-discovery.ts`

**Step 1: Write the link discovery module**

Extracts all internal `<a>` links from a page, normalizes them, and deduplicates against already-visited routes. Also discovers links from `onClick` navigations by scanning `href` attributes in buttons and other interactive elements.

Create `packages/e2e/crawl/link-discovery.ts`:

```typescript
/**
 * @module link-discovery
 * @layer Execution
 *
 * Extracts internal links from a Playwright page.
 * Normalizes paths, strips query params and hashes,
 * filters out external URLs and excluded patterns.
 *
 * Does NOT handle: JavaScript-only navigation (e.g., programmatic
 * router.push). Those routes are captured when the crawler follows
 * links that lead to pages containing further links.
 */
import type { Page } from "@playwright/test";

export interface DiscoveredLink {
  path: string;
  discoveredFrom: string;
  element: string; // e.g. "a", "button", "div"
  text: string; // visible text of the link
}

interface LinkDiscoveryConfig {
  excludePatterns: string[];
}

/**
 * Extract all internal links from the current page.
 * Returns normalized, deduplicated paths.
 */
export async function discoverLinks(
  page: Page,
  config: LinkDiscoveryConfig
): Promise<DiscoveredLink[]> {
  const currentUrl = page.url();
  const baseOrigin = new URL(currentUrl).origin;

  const rawLinks = await page.evaluate((origin: string) => {
    const results: Array<{
      href: string;
      element: string;
      text: string;
    }> = [];

    // All <a> elements with href
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      const anchor = a as HTMLAnchorElement;
      results.push({
        href: anchor.href,
        element: "a",
        text: anchor.textContent?.trim().slice(0, 100) ?? "",
      });
    }

    // Elements with data-href or role="link" (common in SPAs)
    const roleLinks = document.querySelectorAll("[data-href], [role='link'][href]");
    for (const el of roleLinks) {
      const href = el.getAttribute("data-href") ?? el.getAttribute("href") ?? "";
      if (href) {
        results.push({
          href: href.startsWith("/") ? `${origin}${href}` : href,
          element: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 100) ?? "",
        });
      }
    }

    // Clickable cards that wrap links (common pattern: card onClick → navigate)
    const clickableCards = document.querySelectorAll("[data-testid*='card'] a, .cursor-pointer a");
    for (const a of clickableCards) {
      const anchor = a as HTMLAnchorElement;
      if (anchor.href && !results.some((r) => r.href === anchor.href)) {
        results.push({
          href: anchor.href,
          element: "card-link",
          text: anchor.closest("[data-testid]")?.textContent?.trim().slice(0, 100) ?? anchor.textContent?.trim().slice(0, 100) ?? "",
        });
      }
    }

    return results;
  }, baseOrigin);

  const excludeRegexes = config.excludePatterns.map((p) => new RegExp(p));

  const links: DiscoveredLink[] = [];
  const seenPaths = new Set<string>();

  for (const raw of rawLinks) {
    const path = normalizePath(raw.href, baseOrigin);
    if (!path) continue;
    if (seenPaths.has(path)) continue;
    if (excludeRegexes.some((re) => re.test(raw.href))) continue;

    // Only internal links
    if (raw.href.startsWith("http") && !raw.href.startsWith(baseOrigin)) continue;

    seenPaths.add(path);
    links.push({
      path,
      discoveredFrom: new URL(currentUrl).pathname,
      element: raw.element,
      text: raw.text,
    });
  }

  return links;
}

/**
 * Normalize a URL to a clean pathname.
 * Strips origin, query params, hash, trailing slashes.
 */
function normalizePath(href: string, baseOrigin: string): string | null {
  try {
    const url = new URL(href, baseOrigin);

    // Only same-origin links
    if (url.origin !== baseOrigin) return null;

    let path = url.pathname;

    // Strip trailing slash (except root)
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    return path;
  } catch {
    // Malformed URL
    return null;
  }
}
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/link-discovery.ts
git commit -m "feat(e2e): add link discovery module for internal URL extraction"
```

---

## Task 6: Create the sitemap manager module

**Files:**
- Create: `packages/e2e/crawl/sitemap.ts`

**Step 1: Write the sitemap manager**

Reads/writes `sitemap.json`. Tracks all discovered routes with metadata. Updated every crawl run.

Create `packages/e2e/crawl/sitemap.ts`:

```typescript
/**
 * @module sitemap
 * @layer Execution
 *
 * Persistent sitemap for the discovery crawler.
 * Reads from / writes to sitemap.json in the e2e package root.
 * Each crawl run loads the existing sitemap as a starting set,
 * discovers new routes, and writes the updated sitemap back.
 *
 * The sitemap is committed to git so it accumulates route knowledge
 * across development sessions.
 */
import fs from "fs";
import path from "path";

export interface SitemapRoute {
  path: string;
  discoveredFrom: string | null;
  lastVisited: string | null;
  linkText: string;
  visitCount: number;
}

export interface Sitemap {
  lastUpdated: string;
  routes: SitemapRoute[];
}

const SITEMAP_PATH = path.resolve(__dirname, "../sitemap.json");

/**
 * Load existing sitemap or return a default with just "/".
 */
export function loadSitemap(): Sitemap {
  if (fs.existsSync(SITEMAP_PATH)) {
    const raw = fs.readFileSync(SITEMAP_PATH, "utf-8");
    return JSON.parse(raw) as Sitemap;
  }
  return {
    lastUpdated: new Date().toISOString(),
    routes: [
      {
        path: "/",
        discoveredFrom: null,
        lastVisited: null,
        linkText: "Root",
        visitCount: 0,
      },
    ],
  };
}

/**
 * Save the sitemap to disk.
 */
export function saveSitemap(sitemap: Sitemap): void {
  sitemap.lastUpdated = new Date().toISOString();
  fs.writeFileSync(SITEMAP_PATH, JSON.stringify(sitemap, null, 2) + "\n");
}

/**
 * Add a route to the sitemap if it doesn't already exist.
 * Returns true if the route was new.
 */
export function addRoute(
  sitemap: Sitemap,
  routePath: string,
  discoveredFrom: string | null,
  linkText: string
): boolean {
  const existing = sitemap.routes.find((r) => r.path === routePath);
  if (existing) return false;

  sitemap.routes.push({
    path: routePath,
    discoveredFrom,
    lastVisited: null,
    linkText,
    visitCount: 0,
  });
  return true;
}

/**
 * Mark a route as visited (updates lastVisited and increments visitCount).
 */
export function markVisited(sitemap: Sitemap, routePath: string): void {
  const route = sitemap.routes.find((r) => r.path === routePath);
  if (route) {
    route.lastVisited = new Date().toISOString();
    route.visitCount += 1;
  }
}

/**
 * Get all routes that haven't been visited in this session.
 */
export function getUnvisitedRoutes(
  sitemap: Sitemap,
  visitedThisRun: Set<string>
): SitemapRoute[] {
  return sitemap.routes.filter((r) => !visitedThisRun.has(r.path));
}
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/sitemap.ts
git commit -m "feat(e2e): add persistent sitemap manager for route tracking"
```

---

## Task 7: Create the report writer module

**Files:**
- Create: `packages/e2e/crawl/report-writer.ts`

**Step 1: Write the report writer**

Writes structured JSON error reports to `logs/`. Splits errors by category into separate files.

Create `packages/e2e/crawl/report-writer.ts`:

```typescript
/**
 * @module report-writer
 * @layer Execution
 *
 * Writes crawl results to the project logs/ directory.
 * Produces:
 *   - logs/crawl-summary.json (overview stats)
 *   - logs/errors/console-errors.json
 *   - logs/errors/network-errors.json
 *   - logs/errors/page-errors.json (uncaught exceptions, broken images, empty pages)
 *
 * All files are JSON, machine-readable, designed for downstream
 * LLM analysis and agent consumption.
 */
import fs from "fs";
import path from "path";
import type { CrawlError } from "./error-collector";
import type { Sitemap } from "./sitemap";

const LOGS_DIR = path.resolve(__dirname, "../../../logs");
const ERRORS_DIR = path.resolve(LOGS_DIR, "errors");
const ANALYZED_DIR = path.resolve(LOGS_DIR, "analyzed");

export interface CrawlSummary {
  timestamp: string;
  durationMs: number;
  pagesVisited: number;
  pagesDiscovered: number;
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  pagesWithErrors: string[];
  sitemap: Sitemap;
}

/**
 * Write all crawl results to logs/ directory.
 */
export function writeReports(
  errors: CrawlError[],
  sitemap: Sitemap,
  startTime: number
): void {
  // Ensure directories exist
  fs.mkdirSync(ERRORS_DIR, { recursive: true });
  fs.mkdirSync(ANALYZED_DIR, { recursive: true });

  const durationMs = Date.now() - startTime;

  // Categorize errors
  const consoleErrors = errors.filter(
    (e) => e.category === "console-error" || e.category === "console-warning"
  );
  const networkErrors = errors.filter(
    (e) =>
      e.category === "network-error" ||
      e.category === "network-4xx" ||
      e.category === "network-5xx"
  );
  const pageErrors = errors.filter(
    (e) =>
      e.category === "uncaught-exception" ||
      e.category === "broken-image" ||
      e.category === "empty-page"
  );

  // Error counts by category
  const errorsByCategory: Record<string, number> = {};
  const errorsBySeverity: Record<string, number> = {};
  for (const err of errors) {
    errorsByCategory[err.category] = (errorsByCategory[err.category] ?? 0) + 1;
    errorsBySeverity[err.severity] = (errorsBySeverity[err.severity] ?? 0) + 1;
  }

  // Pages that had errors
  const pagesWithErrors = [
    ...new Set(errors.map((e) => e.page)),
  ];

  // Write summary
  const summary: CrawlSummary = {
    timestamp: new Date().toISOString(),
    durationMs,
    pagesVisited: sitemap.routes.filter((r) => r.lastVisited).length,
    pagesDiscovered: sitemap.routes.length,
    totalErrors: errors.length,
    errorsByCategory,
    errorsBySeverity,
    pagesWithErrors,
    sitemap,
  };

  writeJson(path.join(LOGS_DIR, "crawl-summary.json"), summary);
  writeJson(path.join(ERRORS_DIR, "console-errors.json"), consoleErrors);
  writeJson(path.join(ERRORS_DIR, "network-errors.json"), networkErrors);
  writeJson(path.join(ERRORS_DIR, "page-errors.json"), pageErrors);
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/report-writer.ts
git commit -m "feat(e2e): add report writer for structured JSON error logs"
```

---

## Task 8: Create the main discovery crawler test

**Files:**
- Create: `packages/e2e/crawl/discovery-crawler.test.ts`

**Step 1: Write the discovery crawler test**

This is the main Playwright test that orchestrates the crawl. It loads the sitemap, visits each page, discovers new links, records all errors, and writes reports.

Create `packages/e2e/crawl/discovery-crawler.test.ts`:

```typescript
/**
 * @module discovery-crawler.test
 * @layer Execution
 *
 * Main Playwright test for the UI discovery crawler.
 *
 * Algorithm:
 *   1. Load sitemap.json (or start with ["/"])
 *   2. Queue all known routes
 *   3. For each page:
 *      a. Navigate, wait for network settle (up to pageTimeout)
 *      b. Collect errors (console, network, DOM)
 *      c. Discover internal links
 *      d. Add new routes to queue + sitemap
 *   4. Repeat until no unvisited pages remain
 *   5. Save updated sitemap + write error reports to logs/
 *
 * Run via: npm run crawl (from packages/e2e)
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { ErrorCollector } from "./error-collector";
import { discoverLinks } from "./link-discovery";
import { loadSitemap, saveSitemap, addRoute, markVisited } from "./sitemap";
import { writeReports } from "./report-writer";

interface CrawlConfig {
  baseURL: string;
  pageTimeout: number;
  networkIdleTimeout: number;
  maxDepth: number;
  excludePatterns: string[];
}

function loadConfig(): CrawlConfig {
  const configPath = path.resolve(__dirname, "../crawl.config.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as CrawlConfig;
}

test("discover and crawl all pages", async ({ page }) => {
  const config = loadConfig();
  const collector = new ErrorCollector();
  const sitemap = loadSitemap();
  const visitedThisRun = new Set<string>();
  const startTime = Date.now();

  // Attach error collector
  collector.attach(page);

  // BFS queue: [path, depth]
  const queue: Array<[string, number]> = sitemap.routes.map((r) => [r.path, 0]);
  const enqueued = new Set<string>(sitemap.routes.map((r) => r.path));

  while (queue.length > 0) {
    const [routePath, depth] = queue.shift()!;

    // Skip if already visited this run
    if (visitedThisRun.has(routePath)) continue;

    // Skip if too deep
    if (depth > config.maxDepth) continue;

    console.log(`[crawl] Visiting: ${routePath} (depth: ${depth}, queue: ${queue.length})`);

    try {
      // Navigate to the page
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
        timeout: config.pageTimeout,
      });

      // Wait for network to settle (best-effort, don't fail if timeout)
      await page.waitForLoadState("networkidle", {
        timeout: config.networkIdleTimeout,
      }).catch(() => {
        // Network idle timeout is expected for pages with SSE/polling
        console.log(`[crawl] Network idle timeout on ${routePath} (expected for streaming pages)`);
      });

      // Additional settle time for React rendering + animations
      await page.waitForTimeout(1000);

      // Check DOM for broken images and empty pages
      await collector.checkDom(page);

      // Mark as visited
      visitedThisRun.add(routePath);
      markVisited(sitemap, routePath);

      // Discover new links
      const links = await discoverLinks(page, {
        excludePatterns: config.excludePatterns,
      });

      for (const link of links) {
        const isNew = addRoute(sitemap, link.path, link.discoveredFrom, link.text);
        if (isNew && !enqueued.has(link.path)) {
          queue.push([link.path, depth + 1]);
          enqueued.add(link.path);
          console.log(`[crawl]   Discovered: ${link.path} (from ${link.text})`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[crawl] Failed to load ${routePath}: ${message}`);

      // Still mark as visited to avoid infinite retry
      visitedThisRun.add(routePath);
      markVisited(sitemap, routePath);
    }
  }

  // Detach collector
  collector.detach();

  // Write results
  saveSitemap(sitemap);
  const errors = collector.getErrors();
  writeReports(errors, sitemap, startTime);

  // Log summary
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warnCount = errors.filter((e) => e.severity === "warning").length;

  console.log("\n--- Crawl Complete ---");
  console.log(`Pages visited: ${visitedThisRun.size}`);
  console.log(`Total routes known: ${sitemap.routes.length}`);
  console.log(`Errors: ${errorCount}, Warnings: ${warnCount}`);
  console.log(`Reports written to logs/`);

  // The test itself always passes — errors are recorded in logs, not as test failures.
  // The analyzer step will prioritize and suggest fixes.
  expect(true).toBe(true);
});
```

**Step 2: Run the crawler to verify it works**

```bash
cd packages/e2e && npm run crawl
```

Expected: crawler starts at `/`, discovers links, visits pages, writes `sitemap.json` and `logs/` files.

**Step 3: Verify outputs exist**

```bash
cat packages/e2e/sitemap.json | head -20
cat logs/crawl-summary.json | head -20
ls logs/errors/
```

Expected: sitemap has multiple routes, summary has page counts, errors/ has three JSON files.

**Step 4: Commit**

```bash
git add packages/e2e/crawl/discovery-crawler.test.ts packages/e2e/sitemap.json
git commit -m "feat(e2e): add main discovery crawler test with BFS page traversal"
```

---

## Task 9: Create the source mapper module (for LLM analyzer)

**Files:**
- Create: `packages/e2e/crawl/analyze/source-mapper.ts`

**Step 1: Write the source mapper**

Maps crawl errors to source code files. Uses stack traces (when available) and route-to-component mapping (parsed from the router file).

Create `packages/e2e/crawl/analyze/source-mapper.ts`:

```typescript
/**
 * @module source-mapper
 * @layer Execution
 *
 * Maps crawl errors to relevant source code files.
 *
 * Strategy:
 *   1. Stack traces: extract file paths from stack trace strings
 *   2. Route mapping: parse the React router to map URL paths → page components
 *   3. Component tree: for page components, find their imported child components
 *
 * Returns file paths + relevant line ranges for each error,
 * used by the LLM analyzer to include source context in prompts.
 */
import fs from "fs";
import path from "path";
import type { CrawlError } from "../error-collector";

const WEB_SRC = path.resolve(__dirname, "../../../../packages/web/src");

export interface SourceMapping {
  filePath: string;
  lines?: { start: number; end: number };
  reason: string; // why this file was identified as relevant
}

/**
 * Find source files relevant to an error.
 */
export function mapErrorToSources(error: CrawlError): SourceMapping[] {
  const sources: SourceMapping[] = [];

  // Strategy 1: Extract from stack traces
  const stackSources = extractFromStack(error);
  sources.push(...stackSources);

  // Strategy 2: Map URL path to page component
  const routeSources = mapRouteToComponent(error.page);
  sources.push(...routeSources);

  // Strategy 3: For network errors, check API client files
  if (
    error.category === "network-error" ||
    error.category === "network-4xx" ||
    error.category === "network-5xx"
  ) {
    const apiSources = mapNetworkErrorToApiFiles(error);
    sources.push(...apiSources);
  }

  // Deduplicate by file path
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.filePath)) return false;
    seen.add(s.filePath);
    return true;
  });
}

/**
 * Read source file content for LLM context.
 * Returns the file content, optionally scoped to a line range.
 */
export function readSourceContext(mapping: SourceMapping): string | null {
  try {
    const content = fs.readFileSync(mapping.filePath, "utf-8");
    if (mapping.lines) {
      const lines = content.split("\n");
      const start = Math.max(0, mapping.lines.start - 5); // 5 lines before
      const end = Math.min(lines.length, mapping.lines.end + 5); // 5 lines after
      return lines.slice(start, end).join("\n");
    }
    // If file is very large, truncate to first 200 lines
    const lines = content.split("\n");
    if (lines.length > 200) {
      return lines.slice(0, 200).join("\n") + "\n... (truncated)";
    }
    return content;
  } catch {
    return null;
  }
}

/**
 * Extract file paths from stack trace strings.
 * Looks for patterns like "at Component (file.tsx:42:10)" or
 * webpack-style "webpack:///./src/components/Foo.tsx?:42:10"
 */
function extractFromStack(error: CrawlError): SourceMapping[] {
  const stack = (error.details.stack as string) ?? "";
  if (!stack) return [];

  const sources: SourceMapping[] = [];

  // Match common stack trace patterns
  // Pattern: at Something (http://localhost:5173/src/components/Foo.tsx:42:10)
  const urlPattern = /(?:localhost:\d+)(\/src\/[^:?\s]+):(\d+)/g;
  let match;
  while ((match = urlPattern.exec(stack)) !== null) {
    const relativePath = match[1];
    const line = parseInt(match[2], 10);
    const filePath = path.join(WEB_SRC, "..", relativePath);

    if (fs.existsSync(filePath)) {
      sources.push({
        filePath,
        lines: { start: Math.max(1, line - 5), end: line + 5 },
        reason: `Referenced in stack trace at line ${line}`,
      });
    }
  }

  // Pattern: plain relative paths like "src/components/Foo.tsx"
  const relPattern = /src\/[^\s:)]+\.tsx?/g;
  while ((match = relPattern.exec(stack)) !== null) {
    const filePath = path.resolve(WEB_SRC, "..", match[0]);
    if (fs.existsSync(filePath) && !sources.some((s) => s.filePath === filePath)) {
      sources.push({
        filePath,
        reason: "Referenced in stack trace",
      });
    }
  }

  return sources;
}

/**
 * Map a URL path to its page component by reading the router file.
 * Parses route definitions to find which component renders at each path.
 */
function mapRouteToComponent(pageUrl: string): SourceMapping[] {
  const sources: SourceMapping[] = [];

  let pathname: string;
  try {
    pathname = new URL(pageUrl).pathname;
  } catch {
    pathname = pageUrl;
  }

  // Read the router file
  const routerPath = path.join(WEB_SRC, "router.tsx");
  if (!fs.existsSync(routerPath)) return sources;

  const routerContent = fs.readFileSync(routerPath, "utf-8");

  // Extract route definitions: path="..." and nearby component imports
  // Pattern: <Route path="/foo/:id" element={...<ComponentName />...} />
  const routePattern = /<Route\s+path="([^"]+)"\s+element=\{[^}]*<(\w+)\s/g;
  const routes: Array<{ pattern: string; component: string }> = [];
  let match;
  while ((match = routePattern.exec(routerContent)) !== null) {
    routes.push({ pattern: match[1], component: match[2] });
  }

  // Find matching route
  for (const route of routes) {
    if (matchRoute(route.pattern, pathname)) {
      // Find the import for this component
      const importPattern = new RegExp(
        `import\\s+\\{\\s*${route.component}\\s*\\}\\s+from\\s+"([^"]+)"`
      );
      const importMatch = importPattern.exec(routerContent);
      if (importMatch) {
        const importPath = importMatch[1];
        const filePath = resolveImport(importPath, path.dirname(routerPath));
        if (filePath) {
          sources.push({
            filePath,
            reason: `Page component for route "${route.pattern}"`,
          });
        }
      }
    }
  }

  return sources;
}

/**
 * For network errors, identify the API client file making the request.
 */
function mapNetworkErrorToApiFiles(error: CrawlError): SourceMapping[] {
  const sources: SourceMapping[] = [];
  const url = (error.details.url as string) ?? "";

  // Extract the API path: /api/v1/properties → properties
  const apiMatch = /\/api\/v1\/(\w[\w-]*)/.exec(url);
  if (!apiMatch) return sources;

  const resource = apiMatch[1];

  // Check for matching API client file
  const apiDir = path.join(WEB_SRC, "api");
  if (!fs.existsSync(apiDir)) return sources;

  const candidates = fs.readdirSync(apiDir).filter((f) => f.endsWith(".ts"));
  for (const file of candidates) {
    const name = file.replace(/\.ts$/, "");
    // Match resource name: "properties" → "properties.ts"
    if (resource.startsWith(name) || name.startsWith(resource.replace(/-/g, ""))) {
      sources.push({
        filePath: path.join(apiDir, file),
        reason: `API client for ${resource} resource`,
      });
    }
  }

  return sources;
}

/**
 * Match a route pattern (with :params) against a pathname.
 */
function matchRoute(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");

  if (patternParts.length !== pathParts.length) return false;

  return patternParts.every(
    (part, i) => part.startsWith(":") || part === pathParts[i]
  );
}

/**
 * Resolve a TypeScript import path to an absolute file path.
 */
function resolveImport(
  importPath: string,
  fromDir: string
): string | null {
  // Handle relative imports
  const base = path.resolve(fromDir, importPath);
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/analyze/source-mapper.ts
git commit -m "feat(e2e): add source mapper for error-to-code file resolution"
```

---

## Task 10: Create the LLM client module

**Files:**
- Create: `packages/e2e/crawl/analyze/llm-client.ts`

**Step 1: Write the LLM client**

Thin wrapper around the Anthropic SDK. Sends error + source context and gets back structured analysis.

Create `packages/e2e/crawl/analyze/llm-client.ts`:

```typescript
/**
 * @module llm-client
 * @layer Execution
 *
 * Claude API client for error analysis.
 * Sends error context + relevant source code and receives
 * structured diagnosis with suggested fixes.
 *
 * Uses the Anthropic SDK with structured JSON output.
 */
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../../.env.test") });

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ErrorAnalysis {
  diagnosis: string;
  suggestedFix: string;
  relevantFiles: Array<{
    path: string;
    lines?: string;
  }>;
  confidence: number;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface AnalyzeInput {
  errorMessage: string;
  errorCategory: string;
  pageUrl: string;
  details: Record<string, unknown>;
  sourceContext: Array<{
    filePath: string;
    content: string;
    reason: string;
  }>;
}

/**
 * Analyze a single error using Claude API.
 * Returns structured diagnosis and fix suggestion.
 */
export async function analyzeError(
  input: AnalyzeInput
): Promise<ErrorAnalysis> {
  const sourceContextStr = input.sourceContext
    .map(
      (s) =>
        `--- ${s.filePath} (${s.reason}) ---\n${s.content}\n--- end ---`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are analyzing a UI error found by an automated web crawler. Provide a structured diagnosis.

## Error
- **Category:** ${input.errorCategory}
- **Page URL:** ${input.pageUrl}
- **Message:** ${input.errorMessage}
- **Details:** ${JSON.stringify(input.details, null, 2)}

## Relevant Source Code
${sourceContextStr || "No source code mapped for this error."}

## Instructions
Analyze this error and respond with ONLY a JSON object (no markdown, no code fences):
{
  "diagnosis": "Brief explanation of the root cause",
  "suggestedFix": "Specific code change or approach to fix this",
  "relevantFiles": [{"path": "relative/path/to/file.tsx", "lines": "42-50"}],
  "confidence": 0.0 to 1.0,
  "category": "null-safety|missing-data|network|rendering|routing|auth|config|other",
  "severity": "critical|high|medium|low"
}

Be specific about the fix. Reference exact function names, variable names, and line numbers when possible.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text) as ErrorAnalysis;
  } catch {
    // If Claude didn't return valid JSON, wrap the response
    return {
      diagnosis: text,
      suggestedFix: "Unable to parse structured response",
      relevantFiles: [],
      confidence: 0.3,
      category: "other",
      severity: "medium",
    };
  }
}

/**
 * Analyze errors in batches with concurrency control.
 * Avoids hammering the API.
 */
export async function analyzeErrorBatch(
  inputs: AnalyzeInput[],
  concurrency: number = 3
): Promise<ErrorAnalysis[]> {
  const results: ErrorAnalysis[] = [];
  const queue = [...inputs];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const input = queue.shift()!;
      try {
        const analysis = await analyzeError(input);
        results.push(analysis);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          diagnosis: `Analysis failed: ${message}`,
          suggestedFix: "Manual investigation required",
          relevantFiles: [],
          confidence: 0,
          category: "other",
          severity: "medium",
        });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/analyze/llm-client.ts
git commit -m "feat(e2e): add Claude API client for error analysis"
```

---

## Task 11: Create the main error analyzer orchestrator

**Files:**
- Create: `packages/e2e/crawl/analyze/analyze-errors.ts`

**Step 1: Write the analyzer orchestrator**

Reads raw error logs, maps each to source files, sends to Claude, writes enriched output + fix queue.

Create `packages/e2e/crawl/analyze/analyze-errors.ts`:

```typescript
/**
 * @module analyze-errors
 * @layer Orchestration
 *
 * Post-crawl error analyzer.
 * Reads raw error logs from logs/errors/, maps each error to source files,
 * sends context to Claude API for analysis, and writes enriched results
 * to logs/analyzed/.
 *
 * Usage: npx tsx crawl/analyze/analyze-errors.ts
 * Or via: npm run crawl:analyze
 */
import fs from "fs";
import path from "path";
import type { CrawlError } from "../error-collector";
import { mapErrorToSources, readSourceContext } from "./source-mapper";
import { analyzeErrorBatch, type ErrorAnalysis } from "./llm-client";

const LOGS_DIR = path.resolve(__dirname, "../../../../logs");
const ERRORS_DIR = path.join(LOGS_DIR, "errors");
const ANALYZED_DIR = path.join(LOGS_DIR, "analyzed");

interface AnalyzedError {
  id: string;
  type: string;
  severity: string;
  page: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  analysis: ErrorAnalysis;
}

interface FixQueueItem {
  id: string;
  priority: number;
  severity: string;
  confidence: number;
  file: string;
  lines?: string;
  page: string;
  category: string;
  message: string;
  diagnosis: string;
  suggestedFix: string;
  status: "pending";
}

async function main(): Promise<void> {
  console.log("[analyzer] Starting error analysis...\n");

  // Read all error files
  const allErrors: CrawlError[] = [];
  const errorFiles = ["console-errors.json", "network-errors.json", "page-errors.json"];

  for (const file of errorFiles) {
    const filePath = path.join(ERRORS_DIR, file);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const errors: CrawlError[] = JSON.parse(raw);
      allErrors.push(...errors);
      console.log(`[analyzer] Loaded ${errors.length} errors from ${file}`);
    }
  }

  if (allErrors.length === 0) {
    console.log("[analyzer] No errors to analyze. Exiting.");
    return;
  }

  // Deduplicate errors by message (same error on multiple pages → one analysis)
  const uniqueErrors = deduplicateErrors(allErrors);
  console.log(`[analyzer] ${allErrors.length} total errors → ${uniqueErrors.length} unique\n`);

  // Build analysis inputs
  const inputs = uniqueErrors.map((error) => {
    const sources = mapErrorToSources(error);
    const sourceContext = sources
      .map((s) => {
        const content = readSourceContext(s);
        return content ? { filePath: s.filePath, content, reason: s.reason } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return {
      errorMessage: error.message,
      errorCategory: error.category,
      pageUrl: error.page,
      details: error.details,
      sourceContext,
    };
  });

  // Analyze with Claude
  console.log(`[analyzer] Sending ${inputs.length} errors to Claude for analysis...`);
  const analyses = await analyzeErrorBatch(inputs, 3);

  // Combine errors with analyses
  const analyzedErrors: AnalyzedError[] = uniqueErrors.map((error, i) => ({
    id: error.id,
    type: error.category,
    severity: error.severity,
    page: error.page,
    message: error.message,
    details: error.details,
    timestamp: error.timestamp,
    analysis: analyses[i],
  }));

  // Build fix queue (sorted by priority)
  const fixQueue: FixQueueItem[] = analyzedErrors
    .map((e, i) => ({
      id: e.id,
      priority: i + 1,
      severity: e.analysis.severity,
      confidence: e.analysis.confidence,
      file: e.analysis.relevantFiles[0]?.path ?? "unknown",
      lines: e.analysis.relevantFiles[0]?.lines,
      page: e.page,
      category: e.analysis.category,
      message: e.message,
      diagnosis: e.analysis.diagnosis,
      suggestedFix: e.analysis.suggestedFix,
      status: "pending" as const,
    }))
    .sort((a, b) => {
      // Sort by severity (critical > high > medium > low), then confidence desc
      const severityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      const sevDiff =
        (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
      if (sevDiff !== 0) return sevDiff;
      return b.confidence - a.confidence;
    })
    .map((item, i) => ({ ...item, priority: i + 1 }));

  // Write results
  fs.mkdirSync(ANALYZED_DIR, { recursive: true });

  const analyzedPath = path.join(ANALYZED_DIR, "analyzed-errors.json");
  fs.writeFileSync(analyzedPath, JSON.stringify(analyzedErrors, null, 2) + "\n");

  const fixQueuePath = path.join(ANALYZED_DIR, "fix-queue.json");
  const fixQueueOutput = {
    generated: new Date().toISOString(),
    totalErrors: allErrors.length,
    uniqueErrors: uniqueErrors.length,
    analyzed: analyzedErrors.length,
    fixable: fixQueue.filter((f) => f.confidence >= 0.5).length,
    queue: fixQueue,
  };
  fs.writeFileSync(fixQueuePath, JSON.stringify(fixQueueOutput, null, 2) + "\n");

  // Summary
  console.log("\n--- Analysis Complete ---");
  console.log(`Analyzed: ${analyzedErrors.length} unique errors`);
  console.log(
    `Fixable (confidence >= 0.5): ${fixQueue.filter((f) => f.confidence >= 0.5).length}`
  );
  console.log(`Results: ${analyzedPath}`);
  console.log(`Fix queue: ${fixQueuePath}`);
}

/**
 * Deduplicate errors by message content.
 * Keeps the first occurrence of each unique error message.
 */
function deduplicateErrors(errors: CrawlError[]): CrawlError[] {
  const seen = new Set<string>();
  return errors.filter((e) => {
    const key = `${e.category}:${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

main().catch((err) => {
  console.error("[analyzer] Fatal error:", err);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add packages/e2e/crawl/analyze/analyze-errors.ts
git commit -m "feat(e2e): add LLM error analyzer orchestrator with fix queue output"
```

---

## Task 12: Create the run-crawl convenience script

**Files:**
- Create: `packages/e2e/scripts/run-crawl.sh`

**Step 1: Write the shell script**

Create `packages/e2e/scripts/run-crawl.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

cd "$E2E_DIR"

echo "=== UI Discovery Crawler ==="
echo ""

# Step 1: Run the crawler
echo "[1/2] Running discovery crawler..."
npx playwright test --config playwright.crawl.config.ts
echo ""

# Step 2: Run LLM analysis (optional — requires ANTHROPIC_API_KEY)
if [ -n "${ANTHROPIC_API_KEY:-}" ] || grep -q "ANTHROPIC_API_KEY" .env.test 2>/dev/null; then
  echo "[2/2] Running LLM error analysis..."
  npx tsx crawl/analyze/analyze-errors.ts
else
  echo "[2/2] Skipping LLM analysis (ANTHROPIC_API_KEY not set)"
  echo "    Set ANTHROPIC_API_KEY in .env.test to enable"
fi

echo ""
echo "=== Done ==="
echo "Results in: $(cd ../.. && pwd)/logs/"
```

**Step 2: Make executable**

```bash
chmod +x packages/e2e/scripts/run-crawl.sh
```

**Step 3: Add root-level script to monorepo package.json**

Add to root `package.json` scripts:

```json
"crawl": "npm run crawl -w @str-renovator/e2e",
"crawl:full": "npm run crawl:full -w @str-renovator/e2e",
"crawl:analyze": "npm run crawl:analyze -w @str-renovator/e2e"
```

**Step 4: Commit**

```bash
git add packages/e2e/scripts/run-crawl.sh package.json
git commit -m "feat(e2e): add run-crawl convenience script and root-level npm scripts"
```

---

## Task 13: Update .gitignore for logs and auth state

**Files:**
- Modify: `.gitignore` (root)
- Create: `logs/.gitkeep`

**Step 1: Add log entries to root .gitignore**

Append to `.gitignore`:

```
# Crawl logs (regenerated each run, not committed)
logs/*.json
logs/errors/
logs/analyzed/

# Saved auth state
packages/e2e/crawl/auth/.auth-state.json
```

**Step 2: Create .gitkeep to preserve logs directory**

```bash
touch logs/.gitkeep
```

**Step 3: Commit**

```bash
git add .gitignore logs/.gitkeep
git commit -m "chore: add crawl logs and auth state to .gitignore"
```

---

## Task 14: End-to-end smoke test of the full pipeline

**Step 1: Ensure the app is running**

```bash
npm run dev
```

Verify both web (localhost:5173) and API (localhost:3001) are up.

**Step 2: Run the crawler**

```bash
cd packages/e2e && npm run crawl
```

Expected output:
- `[crawl] Visiting: / (depth: 0, queue: N)`
- Discovered routes logged
- `--- Crawl Complete ---`
- `Reports written to logs/`

**Step 3: Verify sitemap was created/updated**

```bash
cat packages/e2e/sitemap.json
```

Expected: JSON with routes array containing `/` plus any discovered routes.

**Step 4: Verify error logs were written**

```bash
ls -la logs/errors/
cat logs/crawl-summary.json | head -20
```

Expected: three JSON files in errors/, summary with page counts.

**Step 5: Run the LLM analyzer (if ANTHROPIC_API_KEY is set)**

```bash
cd packages/e2e && npm run crawl:analyze
```

Expected: analyzed-errors.json and fix-queue.json in logs/analyzed/.

**Step 6: Verify fix-queue output**

```bash
cat logs/analyzed/fix-queue.json | head -30
```

Expected: JSON with `queue` array of prioritized errors with diagnosis and suggestedFix.

**Step 7: Commit sitemap (initial baseline)**

```bash
git add packages/e2e/sitemap.json
git commit -m "chore: add initial sitemap from first crawl run"
```

---

## Summary

| Task | What it creates | Depends on |
|------|----------------|------------|
| 1 | Dependencies + config | — |
| 2 | Crawl Playwright config | Task 1 |
| 3 | Manual auth saver | Task 1 |
| 4 | Error collector module | — |
| 5 | Link discovery module | — |
| 6 | Sitemap manager | — |
| 7 | Report writer | Task 4, 6 |
| 8 | Discovery crawler test | Tasks 4, 5, 6, 7 |
| 9 | Source mapper | Task 4 |
| 10 | LLM client | Task 1 |
| 11 | Error analyzer orchestrator | Tasks 9, 10 |
| 12 | Convenience scripts | Tasks 8, 11 |
| 13 | Gitignore updates | — |
| 14 | End-to-end smoke test | All above |
