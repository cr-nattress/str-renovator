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

import { synthesizePropertyProfile } from "../../skills/synthesize-property-profile/index.js";

describe("synthesizePropertyProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns AiResult with validated profile and metadata", async () => {
    const mockProfile = {
      property_summary: "A charming 2BR cabin in the mountains",
      target_guest: "Couples seeking a quiet retreat",
      key_amenities: ["Hot tub", "Mountain views"],
    };

    mockCreate.mockResolvedValue({
      model: "gpt-4o-2024-08-06",
      choices: [{ message: { content: JSON.stringify(mockProfile) } }],
      usage: { total_tokens: 600 },
    });

    const result = await synthesizePropertyProfile({
      scrapedData: { title: "Mountain Cabin" },
      locationProfile: { area_type: "mountain" },
      propertyName: "Cozy Cabin",
    });

    expect(result.data).toEqual(mockProfile);
    expect(result.metadata).toEqual({
      model: "gpt-4o-2024-08-06",
      tokensUsed: 600,
      promptVersion: expect.any(String),
    });
  });

  it("uses json_object response format", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: '{"property_summary": "test"}' } }],
      usage: { total_tokens: 50 },
    });

    await synthesizePropertyProfile({
      scrapedData: {},
      locationProfile: {},
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.response_format).toEqual({ type: "json_object" });
    expect(callArgs.temperature).toBe(0.3);
  });

  it("throws on empty response", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: null } }],
    });

    await expect(
      synthesizePropertyProfile({ scrapedData: {}, locationProfile: {} })
    ).rejects.toThrow("No content in chat completion response");
  });

  it("throws when API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("Timeout"));

    await expect(
      synthesizePropertyProfile({ scrapedData: {}, locationProfile: {} })
    ).rejects.toThrow("Timeout");
  });

  it("throws on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: "not json" } }],
    });

    await expect(
      synthesizePropertyProfile({ scrapedData: {}, locationProfile: {} })
    ).rejects.toThrow();
  });
});
