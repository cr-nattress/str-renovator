/**
 * @module source-mapper
 * @layer Execution
 *
 * Maps crawl errors to relevant source code files.
 *
 * Strategy:
 *   1. Stack traces: extract file paths from stack trace strings
 *   2. Route mapping: parse the React router to map URL paths → page components
 *   3. Component tree: for page components, find their imported child components
 *
 * Returns file paths + relevant line ranges for each error,
 * used by the LLM analyzer to include source context in prompts.
 */
import fs from "fs";
import path from "path";
import type { CrawlError } from "../error-collector";

const WEB_SRC = path.resolve(__dirname, "../../../../packages/web/src");

export interface SourceMapping {
  filePath: string;
  lines?: { start: number; end: number };
  reason: string; // why this file was identified as relevant
}

/**
 * Find source files relevant to an error.
 */
export function mapErrorToSources(error: CrawlError): SourceMapping[] {
  const sources: SourceMapping[] = [];

  // Strategy 1: Extract from stack traces
  const stackSources = extractFromStack(error);
  sources.push(...stackSources);

  // Strategy 2: Map URL path to page component
  const routeSources = mapRouteToComponent(error.page);
  sources.push(...routeSources);

  // Strategy 3: For network errors, check API client files
  if (
    error.category === "network-error" ||
    error.category === "network-4xx" ||
    error.category === "network-5xx"
  ) {
    const apiSources = mapNetworkErrorToApiFiles(error);
    sources.push(...apiSources);
  }

  // Deduplicate by file path
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.filePath)) return false;
    seen.add(s.filePath);
    return true;
  });
}

/**
 * Read source file content for LLM context.
 * Returns the file content, optionally scoped to a line range.
 */
export function readSourceContext(mapping: SourceMapping): string | null {
  try {
    const content = fs.readFileSync(mapping.filePath, "utf-8");
    if (mapping.lines) {
      const lines = content.split("\n");
      const start = Math.max(0, mapping.lines.start - 5); // 5 lines before
      const end = Math.min(lines.length, mapping.lines.end + 5); // 5 lines after
      return lines.slice(start, end).join("\n");
    }
    // If file is very large, truncate to first 200 lines
    const lines = content.split("\n");
    if (lines.length > 200) {
      return lines.slice(0, 200).join("\n") + "\n... (truncated)";
    }
    return content;
  } catch {
    return null;
  }
}

/**
 * Extract file paths from stack trace strings.
 * Looks for patterns like "at Component (file.tsx:42:10)" or
 * webpack-style "webpack:///./src/components/Foo.tsx?:42:10"
 */
function extractFromStack(error: CrawlError): SourceMapping[] {
  const stack = (error.details.stack as string) ?? "";
  if (!stack) return [];

  const sources: SourceMapping[] = [];

  // Match common stack trace patterns
  // Pattern: at Something (http://localhost:5173/src/components/Foo.tsx:42:10)
  const urlPattern = /(?:localhost:\d+)(\/src\/[^:?\s]+):(\d+)/g;
  let match;
  while ((match = urlPattern.exec(stack)) !== null) {
    const relativePath = match[1];
    const line = parseInt(match[2], 10);
    const filePath = path.join(WEB_SRC, "..", relativePath);

    if (fs.existsSync(filePath)) {
      sources.push({
        filePath,
        lines: { start: Math.max(1, line - 5), end: line + 5 },
        reason: `Referenced in stack trace at line ${line}`,
      });
    }
  }

  // Pattern: plain relative paths like "src/components/Foo.tsx"
  const relPattern = /src\/[^\s:)]+\.tsx?/g;
  while ((match = relPattern.exec(stack)) !== null) {
    const filePath = path.resolve(WEB_SRC, "..", match[0]);
    if (fs.existsSync(filePath) && !sources.some((s) => s.filePath === filePath)) {
      sources.push({
        filePath,
        reason: "Referenced in stack trace",
      });
    }
  }

  return sources;
}

/**
 * Map a URL path to its page component by reading the router file.
 * Parses route definitions to find which component renders at each path.
 */
function mapRouteToComponent(pageUrl: string): SourceMapping[] {
  const sources: SourceMapping[] = [];

  let pathname: string;
  try {
    pathname = new URL(pageUrl).pathname;
  } catch {
    pathname = pageUrl;
  }

  // Read the router file
  const routerPath = path.join(WEB_SRC, "router.tsx");
  if (!fs.existsSync(routerPath)) return sources;

  const routerContent = fs.readFileSync(routerPath, "utf-8");

  // Extract route definitions: path="..." and nearby component imports
  // Pattern: <Route path="/foo/:id" element={...<ComponentName />...} />
  const routePattern = /<Route\s+path="([^"]+)"\s+element=\{[^}]*<(\w+)\s/g;
  const routes: Array<{ pattern: string; component: string }> = [];
  let match;
  while ((match = routePattern.exec(routerContent)) !== null) {
    routes.push({ pattern: match[1], component: match[2] });
  }

  // Find matching route
  for (const route of routes) {
    if (matchRoute(route.pattern, pathname)) {
      // Find the import for this component
      const importPattern = new RegExp(
        `import\\s+\\{\\s*${route.component}\\s*\\}\\s+from\\s+"([^"]+)"`
      );
      const importMatch = importPattern.exec(routerContent);
      if (importMatch) {
        const importPath = importMatch[1];
        const filePath = resolveImport(importPath, path.dirname(routerPath));
        if (filePath) {
          sources.push({
            filePath,
            reason: `Page component for route "${route.pattern}"`,
          });
        }
      }
    }
  }

  return sources;
}

/**
 * For network errors, identify the API client file making the request.
 */
function mapNetworkErrorToApiFiles(error: CrawlError): SourceMapping[] {
  const sources: SourceMapping[] = [];
  const url = (error.details.url as string) ?? "";

  // Extract the API path: /api/v1/properties → properties
  const apiMatch = /\/api\/v1\/(\w[\w-]*)/.exec(url);
  if (!apiMatch) return sources;

  const resource = apiMatch[1];

  // Check for matching API client file
  const apiDir = path.join(WEB_SRC, "api");
  if (!fs.existsSync(apiDir)) return sources;

  const candidates = fs.readdirSync(apiDir).filter((f) => f.endsWith(".ts"));
  for (const file of candidates) {
    const name = file.replace(/\.ts$/, "");
    // Match resource name: "properties" → "properties.ts"
    if (resource.startsWith(name) || name.startsWith(resource.replace(/-/g, ""))) {
      sources.push({
        filePath: path.join(apiDir, file),
        reason: `API client for ${resource} resource`,
      });
    }
  }

  return sources;
}

/**
 * Match a route pattern (with :params) against a pathname.
 */
function matchRoute(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");

  if (patternParts.length !== pathParts.length) return false;

  return patternParts.every(
    (part, i) => part.startsWith(":") || part === pathParts[i]
  );
}

/**
 * Resolve a TypeScript import path to an absolute file path.
 */
function resolveImport(
  importPath: string,
  fromDir: string
): string | null {
  // Handle relative imports
  const base = path.resolve(fromDir, importPath);
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
