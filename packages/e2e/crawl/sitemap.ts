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
