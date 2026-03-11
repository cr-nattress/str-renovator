/**
 * @module llm-client
 * @layer Execution
 *
 * Claude API client for error analysis.
 * Sends error context + relevant source code and receives
 * structured diagnosis with suggested fixes.
 *
 * Uses the Anthropic SDK with structured JSON output.
 */
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../../.env.test") });

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ErrorAnalysis {
  diagnosis: string;
  suggestedFix: string;
  relevantFiles: Array<{
    path: string;
    lines?: string;
  }>;
  confidence: number;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface AnalyzeInput {
  errorMessage: string;
  errorCategory: string;
  pageUrl: string;
  details: Record<string, unknown>;
  sourceContext: Array<{
    filePath: string;
    content: string;
    reason: string;
  }>;
}

/**
 * Analyze a single error using Claude API.
 * Returns structured diagnosis and fix suggestion.
 */
export async function analyzeError(
  input: AnalyzeInput
): Promise<ErrorAnalysis> {
  const sourceContextStr = input.sourceContext
    .map(
      (s) =>
        `--- ${s.filePath} (${s.reason}) ---\n${s.content}\n--- end ---`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are analyzing a UI error found by an automated web crawler. Provide a structured diagnosis.

## Error
- **Category:** ${input.errorCategory}
- **Page URL:** ${input.pageUrl}
- **Message:** ${input.errorMessage}
- **Details:** ${JSON.stringify(input.details, null, 2)}

## Relevant Source Code
${sourceContextStr || "No source code mapped for this error."}

## Instructions
Analyze this error and respond with ONLY a JSON object (no markdown, no code fences):
{
  "diagnosis": "Brief explanation of the root cause",
  "suggestedFix": "Specific code change or approach to fix this",
  "relevantFiles": [{"path": "relative/path/to/file.tsx", "lines": "42-50"}],
  "confidence": 0.0 to 1.0,
  "category": "null-safety|missing-data|network|rendering|routing|auth|config|other",
  "severity": "critical|high|medium|low"
}

Be specific about the fix. Reference exact function names, variable names, and line numbers when possible.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text) as ErrorAnalysis;
  } catch {
    // If Claude didn't return valid JSON, wrap the response
    return {
      diagnosis: text,
      suggestedFix: "Unable to parse structured response",
      relevantFiles: [],
      confidence: 0.3,
      category: "other",
      severity: "medium",
    };
  }
}

/**
 * Analyze errors in batches with concurrency control.
 * Avoids hammering the API.
 */
export async function analyzeErrorBatch(
  inputs: AnalyzeInput[],
  concurrency: number = 3
): Promise<ErrorAnalysis[]> {
  const results: ErrorAnalysis[] = [];
  const queue = [...inputs];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const input = queue.shift()!;
      try {
        const analysis = await analyzeError(input);
        results.push(analysis);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          diagnosis: `Analysis failed: ${message}`,
          suggestedFix: "Manual investigation required",
          relevantFiles: [],
          confidence: 0,
          category: "other",
          severity: "medium",
        });
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}
