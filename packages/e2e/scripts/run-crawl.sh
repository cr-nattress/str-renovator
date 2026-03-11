#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

cd "$E2E_DIR"

echo "=== UI Discovery Crawler ==="
echo ""

# Step 1: Run the crawler
echo "[1/2] Running discovery crawler..."
npx playwright test --config playwright.crawl.config.ts
echo ""

# Step 2: Run LLM analysis (optional — requires ANTHROPIC_API_KEY)
if [ -n "${ANTHROPIC_API_KEY:-}" ] || grep -q "ANTHROPIC_API_KEY" .env.test 2>/dev/null; then
  echo "[2/2] Running LLM error analysis..."
  npx tsx crawl/analyze/analyze-errors.ts
else
  echo "[2/2] Skipping LLM analysis (ANTHROPIC_API_KEY not set)"
  echo "    Set ANTHROPIC_API_KEY in .env.test to enable"
fi

echo ""
echo "=== Done ==="
echo "Results in: $(cd ../.. && pwd)/logs/"
