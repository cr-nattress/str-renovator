import { chromium } from "playwright";

export interface ScrapedPhoto {
  url: string;
  filename: string;
}

export interface ScrapeResult {
  photos: ScrapedPhoto[];
  pageContent: string;
}

async function scrapeListingContent(
  page: import("playwright").Page
): Promise<string> {
  const text = await page.evaluate(() => {
    // Remove nav, footer, scripts, styles
    const elementsToRemove = document.querySelectorAll(
      "nav, footer, script, style, noscript, [role='navigation'], [role='banner']"
    );
    elementsToRemove.forEach((el) => el.remove());

    return document.body.innerText || "";
  });

  // Cap at 15k characters
  return text.slice(0, 15_000);
}

export async function scrapeListingPhotos(
  listingUrl: string
): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    // Use networkidle — Airbnb is a React SPA that renders after domcontentloaded
    await page.goto(listingUrl, { waitUntil: "networkidle", timeout: 45000 });

    let imageUrls: string[] = [];

    // Detect platform and scrape accordingly
    if (listingUrl.includes("airbnb")) {
      imageUrls = await scrapeAirbnb(page);
    } else if (listingUrl.includes("vrbo") || listingUrl.includes("homeaway")) {
      imageUrls = await scrapeVrbo(page);
    } else {
      // Generic: grab all large images
      imageUrls = await scrapeGeneric(page);
    }

    // Deduplicate and filter
    const unique = [...new Set(imageUrls)].filter(
      (url) => url.startsWith("http") && !url.includes("avatar") && !url.includes("icon")
    );

    const photos = unique.map((url, i) => ({
      url,
      filename: `scraped_${String(i + 1).padStart(2, "0")}.jpg`,
    }));

    const pageContent = await scrapeListingContent(page);

    return { photos, pageContent };
  } finally {
    await browser.close();
  }
}

async function scrapeAirbnb(page: import("playwright").Page): Promise<string[]> {
  // Wait for the listing to actually render (SPA hydration)
  try {
    await page.waitForSelector("h1", { timeout: 10000 });
  } catch {
    // Continue anyway — page may have a different structure
  }

  // Try to click "Show all photos" button
  try {
    const showAllBtn = page.locator('button:has-text("Show all photos")');
    if (await showAllBtn.isVisible({ timeout: 5000 })) {
      await showAllBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {
    // Button not found, continue with what's on page
  }

  // Scroll through the gallery to trigger lazy-loaded images
  await scrollToLoadAll(page);

  // Extract image URLs — only actual listing photos
  const urls = await page.evaluate(() => {
    const images = document.querySelectorAll("img[src]");
    return Array.from(images)
      .map((img) => (img as HTMLImageElement).src)
      .filter((src) => {
        // Must be from Airbnb CDN
        if (!src.includes("muscache.com") && !src.includes("airbnbcdn")) return false;
        // Exclude platform assets (icons, laurels, badges)
        if (src.includes("platform-assets")) return false;
        if (src.includes("LaurelItem")) return false;
        // Exclude user profile photos
        if (src.includes("/User-") || src.includes("/User/")) return false;
        // Must be an actual listing photo (Hosting- or Pictures path)
        return src.includes("/Hosting-") || src.includes("/Pictures/");
      });
  });

  // Upgrade to high-res versions
  return urls.map((url) => {
    if (url.includes("im_w=")) {
      return url.replace(/im_w=\d+/, "im_w=1200");
    }
    return url;
  });
}

/** Scroll the photo gallery (modal or page) to load all lazy images */
async function scrollToLoadAll(page: import("playwright").Page): Promise<void> {
  let previousCount = 0;
  let stableRounds = 0;

  for (let i = 0; i < 50; i++) {
    // Keyboard PageDown reliably scrolls whichever container has focus,
    // including nested scroll containers inside dialogs with overflow:clip
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(250);

    // Check if new images have loaded
    const currentCount = await page.evaluate(() =>
      document.querySelectorAll('img[src*="/Hosting-"]').length
    );

    if (currentCount === previousCount) {
      stableRounds++;
      // No new images for 5 consecutive scrolls — we've loaded everything
      if (stableRounds >= 5) break;
    } else {
      stableRounds = 0;
      previousCount = currentCount;
    }
  }

  // Short pause for any final renders
  await page.waitForTimeout(500);
}

async function scrapeVrbo(page: import("playwright").Page): Promise<string[]> {
  // Try to open photo gallery
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

async function scrapeGeneric(page: import("playwright").Page): Promise<string[]> {
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

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
