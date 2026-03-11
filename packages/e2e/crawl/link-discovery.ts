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
