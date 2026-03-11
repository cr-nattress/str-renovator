import { chromium, type Page } from "playwright";

export interface ScrapedPhoto {
  url: string;
  filename: string;
}

export interface ScrapeResult {
  photos: ScrapedPhoto[];
  pageContent: string;
}

export interface ReviewScrapeResult {
  reviewContent: string;
  reviewCount: number;
}

const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Launches a headless browser, navigates to the URL, runs the callback, and cleans up */
async function withScraperPage<T>(
  url: string,
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: SCRAPER_USER_AGENT,
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

/** Waits for Airbnb SPA hydration by looking for the h1 element */
async function waitForAirbnbRender(page: Page): Promise<void> {
  try {
    await page.waitForSelector("h1", { timeout: 10000 });
  } catch {
    // Continue anyway — page may have a different structure
  }
}

async function scrapeListingContent(page: Page): Promise<string> {
  const text = await page.evaluate(() => {
    const elementsToRemove = document.querySelectorAll(
      "nav, footer, script, style, noscript, [role='navigation'], [role='banner']"
    );
    elementsToRemove.forEach((el) => el.remove());

    return document.body.innerText || "";
  });

  return text.slice(0, 15_000);
}

export async function scrapeListingPhotos(
  listingUrl: string
): Promise<ScrapeResult> {
  return withScraperPage(listingUrl, async (page) => {
    let imageUrls: string[] = [];

    if (listingUrl.includes("airbnb")) {
      imageUrls = await scrapeAirbnb(page);
    } else if (listingUrl.includes("vrbo") || listingUrl.includes("homeaway")) {
      imageUrls = await scrapeVrbo(page);
    } else {
      imageUrls = await scrapeGeneric(page);
    }

    const unique = [...new Set(imageUrls)].filter(
      (url) => url.startsWith("http") && !url.includes("avatar") && !url.includes("icon")
    );

    const photos = unique.map((url, i) => ({
      url,
      filename: `scraped_${String(i + 1).padStart(2, "0")}.jpg`,
    }));

    const pageContent = await scrapeListingContent(page);

    return { photos, pageContent };
  });
}

async function scrapeAirbnb(page: Page): Promise<string[]> {
  await waitForAirbnbRender(page);

  try {
    const showAllBtn = page.locator('button:has-text("Show all photos")');
    if (await showAllBtn.isVisible({ timeout: 5000 })) {
      await showAllBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {
    // Button not found, continue with what's on page
  }

  await scrollToLoadContent(page, {
    stabilitySelector: 'img[src*="/Hosting-"]',
  });

  const urls = await page.evaluate(() => {
    const images = document.querySelectorAll("img[src]");
    return Array.from(images)
      .map((img) => (img as HTMLImageElement).src)
      .filter((src) => {
        if (!src.includes("muscache.com") && !src.includes("airbnbcdn")) return false;
        if (src.includes("platform-assets")) return false;
        if (src.includes("LaurelItem")) return false;
        if (src.includes("/User-") || src.includes("/User/")) return false;
        return src.includes("/Hosting-") || src.includes("/Pictures/");
      });
  });

  return urls.map((url) => {
    if (url.includes("im_w=")) {
      return url.replace(/im_w=\d+/, "im_w=1200");
    }
    return url;
  });
}

interface ScrollOptions {
  maxScrolls?: number;
  waitMs?: number;
  stableThreshold?: number;
  /** CSS selector to count for stability detection. If omitted, uses text length. */
  stabilitySelector?: string;
}

/** Scrolls via PageDown to load lazy content, with early exit when content stabilizes */
async function scrollToLoadContent(
  page: Page,
  options: ScrollOptions = {}
): Promise<void> {
  const {
    maxScrolls = 50,
    waitMs = 250,
    stableThreshold = 5,
    stabilitySelector,
  } = options;

  let previousCount = 0;
  let stableRounds = 0;

  for (let i = 0; i < maxScrolls; i++) {
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(waitMs);

    const currentCount = stabilitySelector
      ? await page.evaluate(
          (sel) => document.querySelectorAll(sel).length,
          stabilitySelector
        )
      : await page.evaluate(() => document.body.innerText.length);

    if (currentCount === previousCount) {
      stableRounds++;
      if (stableRounds >= stableThreshold) break;
    } else {
      stableRounds = 0;
      previousCount = currentCount;
    }
  }

  await page.waitForTimeout(500);
}

async function scrapeVrbo(page: Page): Promise<string[]> {
  try {
    const galleryBtn = page.locator('button:has-text("photos"), button:has-text("images")');
    if (await galleryBtn.first().isVisible({ timeout: 5000 })) {
      await galleryBtn.first().click();
      await page.waitForTimeout(2000);
    }
  } catch {
    // Continue with visible images
  }

  return page.evaluate(() => {
    const images = document.querySelectorAll("img[src]");
    return Array.from(images)
      .map((img) => (img as HTMLImageElement).src)
      .filter(
        (src) =>
          (src.includes("vrbo") || src.includes("expedia") || src.includes("http")) &&
          !src.includes("avatar") &&
          !src.includes("logo")
      );
  });
}

async function scrapeGeneric(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const images = document.querySelectorAll("img[src]");
    return Array.from(images)
      .map((img) => {
        const el = img as HTMLImageElement;
        return { src: el.src, w: el.naturalWidth || el.width || 0 };
      })
      .filter((img) => img.w >= 300 || img.src.includes("1200") || img.src.includes("large"))
      .map((img) => img.src);
  });
}

export async function scrapeListingReviews(
  listingUrl: string
): Promise<ReviewScrapeResult> {
  if (!listingUrl.includes("airbnb")) {
    return { reviewContent: "", reviewCount: 0 };
  }

  return withScraperPage(listingUrl, async (page) => {
    await waitForAirbnbRender(page);

    // Try to open the reviews section — multiple fallback selectors
    let reviewsOpened = false;
    const reviewTriggers = [
      'button:has-text("Show all"):has-text("review")',
      'a[href*="#reviews"]',
      'button:has-text("reviews")',
    ];

    for (const selector of reviewTriggers) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 3000 })) {
          await el.click();
          await page.waitForTimeout(2000);
          reviewsOpened = true;
          break;
        }
      } catch {
        // Try next selector
      }
    }

    if (!reviewsOpened) {
      return { reviewContent: "", reviewCount: 0 };
    }

    await scrollToLoadContent(page, {
      maxScrolls: 20,
      waitMs: 300,
      stableThreshold: 3,
    });

    // Extract review text and count in a single evaluate call
    const { text, count } = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      const container = (modal ?? document.body) as HTMLElement;
      const text = container.innerText || "";
      const reviewBlocks = container.querySelectorAll(
        '[data-review-id], [id*="review"]'
      );
      return { text, count: reviewBlocks.length };
    });

    const cappedContent = text.slice(0, 20_000);

    return {
      reviewContent: cappedContent,
      reviewCount: count || Math.max(1, Math.floor(cappedContent.length / 500)),
    };
  }).catch(() => ({ reviewContent: "", reviewCount: 0 }));
}

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
