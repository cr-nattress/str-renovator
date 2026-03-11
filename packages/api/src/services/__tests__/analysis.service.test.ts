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

import { analyzeProperty } from "../../skills/analyze-property/index.js";

const VALID_ANALYSIS = {
  property_assessment: "Well-maintained 2BR cabin",
  style_direction: "Modern rustic",
  photos: [
    {
      filename: "photo1.jpg",
      room: "Living Room",
      strengths: ["Natural light"],
      renovations: "Update flooring",
      priority: "high" as const,
    },
  ],
  action_plan: [
    {
      priority: 1,
      item: "Replace flooring",
      estimated_cost: "$2,000",
      impact: "high" as const,
      rooms_affected: ["Living Room"],
    },
  ],
};

describe("analyzeProperty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns AiResult with validated PropertyAnalysis and metadata", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o-2024-08-06",
      choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }],
      usage: { total_tokens: 1200 },
    });

    const result = await analyzeProperty({
      buffers: [Buffer.from("fake-image")],
      filenames: ["photo1.jpg"],
    });

    expect(result.data).toEqual(VALID_ANALYSIS);
    expect(result.metadata).toEqual({
      model: "gpt-4o-2024-08-06",
      tokensUsed: 1200,
      promptVersion: expect.any(String),
    });
  });

  it("sends image as base64 in message content", async () => {
    const imageBuffer = Buffer.from("test-image-data");
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }],
      usage: { total_tokens: 100 },
    });

    await analyzeProperty({
      buffers: [imageBuffer],
      filenames: ["test.jpg"],
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o");
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");

    const userContent = callArgs.messages[1].content;
    expect(userContent[0].type).toBe("text");
    expect(userContent[1].type).toBe("image_url");
    expect(userContent[1].image_url.url).toContain(
      imageBuffer.toString("base64")
    );
  });

  it("uses custom userPrompt when provided", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: JSON.stringify(VALID_ANALYSIS) } }],
      usage: { total_tokens: 100 },
    });

    await analyzeProperty({
      buffers: [Buffer.from("img")],
      filenames: ["photo.jpg"],
      userPrompt: "Custom batch prompt text",
    });

    const textContent = mockCreate.mock.calls[0][0].messages[1].content[0].text;
    expect(textContent).toBe("Custom batch prompt text");
  });

  it("strips markdown code fences from response", async () => {
    const wrapped = "```json\n" + JSON.stringify(VALID_ANALYSIS) + "\n```";
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: wrapped } }],
      usage: { total_tokens: 100 },
    });

    const result = await analyzeProperty({
      buffers: [Buffer.from("img")],
      filenames: ["photo.jpg"],
    });

    expect(result.data).toEqual(VALID_ANALYSIS);
  });

  it("throws on empty response", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: null } }],
    });

    await expect(
      analyzeProperty({ buffers: [Buffer.from("img")], filenames: ["test.jpg"] })
    ).rejects.toThrow("Empty response from analysis model");
  });

  it("throws on invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: "not json" } }],
    });

    await expect(
      analyzeProperty({ buffers: [Buffer.from("img")], filenames: ["test.jpg"] })
    ).rejects.toThrow();
  });

  it("throws when Zod validation fails", async () => {
    const invalidAnalysis = { property_assessment: "ok" }; // missing required fields
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: JSON.stringify(invalidAnalysis) } }],
      usage: { total_tokens: 50 },
    });

    await expect(
      analyzeProperty({ buffers: [Buffer.from("img")], filenames: ["test.jpg"] })
    ).rejects.toThrow("AI response validation failed");
  });
});
