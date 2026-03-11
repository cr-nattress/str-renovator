import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("../../config/env.js", () => ({
  env: { openaiChatModel: "gpt-4o" },
}));

vi.mock("../../config/openai.js", () => ({
  openai: {
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  },
}));

vi.mock("../../config/rate-limiter.js", () => ({
  chatCompletionLimiter: (fn: () => unknown) => fn(),
}));

import { generateTextReport } from "../../skills/generate-text-report/index.js";

describe("generateTextReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns AiResult with report text and metadata", async () => {
    const reportText = "## Renovation Summary\n\nThe property needs...";

    mockCreate.mockResolvedValue({
      model: "gpt-4o-2024-08-06",
      choices: [{ message: { content: reportText } }],
      usage: { total_tokens: 800 },
    });

    const result = await generateTextReport("renovation data json string");

    expect(result.data).toBe(reportText);
    expect(result.metadata).toEqual({
      model: "gpt-4o-2024-08-06",
      tokensUsed: 800,
      promptVersion: expect.any(String),
    });
  });

  it("passes renovations data in user prompt", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: "Report content" } }],
      usage: { total_tokens: 100 },
    });

    const renovations = '[{"room": "Kitchen", "item": "countertops"}]';
    await generateTextReport(renovations);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o");
    expect(callArgs.max_tokens).toBe(2048);
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
  });

  it("throws on empty response", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: null } }],
    });

    await expect(
      generateTextReport("data")
    ).rejects.toThrow("Empty response from report model");
  });

  it("throws when API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("Rate limited"));

    await expect(
      generateTextReport("data")
    ).rejects.toThrow("Rate limited");
  });
});
