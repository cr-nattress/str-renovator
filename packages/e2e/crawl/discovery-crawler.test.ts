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
