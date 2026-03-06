import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export interface AccessibilityResult {
  violations: Array<{
    id: string;
    impact: string | undefined;
    description: string;
    nodes: number;
  }>;
  passes: number;
}

/** Run axe-core accessibility audit on the current page */
export async function runAccessibilityAudit(
  page: Page
): Promise<AccessibilityResult> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return {
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? undefined,
      description: v.description,
      nodes: v.nodes.length,
    })),
    passes: results.passes.length,
  };
}

/** Check for broken images on the page */
export async function findBrokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const images = document.querySelectorAll("img");
    const broken: string[] = [];
    images.forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) {
        broken.push(img.src || img.getAttribute("data-src") || "unknown");
      }
    });
    return broken;
  });
}

/** Filter console errors — returns meaningful errors only */
export function filterConsoleErrors(errors: string[]): string[] {
  const ignorePatterns = [
    /favicon/i,
    /third.party.cookie/i,
    /clerk/i,
    /react.devtools/i,
    /download the react/i,
    /hydrat/i,
    /ResizeObserver/i,
  ];

  return errors.filter(
    (err) => !ignorePatterns.some((pattern) => pattern.test(err))
  );
}

/** Check for horizontal overflow at a given viewport width */
export async function checkResponsiveOverflow(
  page: Page,
  width: number
): Promise<{ hasOverflow: boolean; overflowAmount: number }> {
  await page.setViewportSize({ width, height: 800 });
  // Let layout settle
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    return {
      hasOverflow: docWidth > viewportWidth,
      overflowAmount: Math.max(0, docWidth - viewportWidth),
    };
  });

  return result;
}
