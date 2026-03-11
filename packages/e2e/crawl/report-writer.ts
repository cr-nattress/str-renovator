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
