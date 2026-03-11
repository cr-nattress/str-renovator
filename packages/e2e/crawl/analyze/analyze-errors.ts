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
