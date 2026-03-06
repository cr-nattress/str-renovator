import { chromium } from "playwright";

export interface ScrapedPhoto {
  url: string;
  filename: string;
}

export async function scrapeListingPhotos(
  listingUrl: string
): Promise<ScrapedPhoto[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

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

    return unique.map((url, i) => ({
      url,
      filename: `scraped_${String(i + 1).padStart(2, "0")}.jpg`,
    }));
  } finally {
    await browser.close();
  }
}

async function scrapeAirbnb(page: import("playwright").Page): Promise<string[]> {
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

  // Extract image URLs from the photo gallery
  const urls = await page.evaluate(() => {
    const images = document.querySelectorAll("img[src]");
    return Array.from(images)
      .map((img) => (img as HTMLImageElement).src)
      .filter(
        (src) =>
          src.includes("muscache.com") ||
          src.includes("airbnbcdn") ||
          (src.includes("http") && img_isLarge(src))
      );

    function img_isLarge(src: string): boolean {
      // Airbnb uses URL params for sizing — look for large variants
      return src.includes("im_w=") || src.includes("aki_policy=large");
    }
  });

  // Upgrade to high-res versions
  return urls.map((url) => {
    if (url.includes("im_w=")) {
      return url.replace(/im_w=\d+/, "im_w=1200");
    }
    return url;
  });
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
