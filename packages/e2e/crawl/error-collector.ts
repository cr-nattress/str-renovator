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
