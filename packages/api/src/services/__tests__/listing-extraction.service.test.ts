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

import { extractListingData } from "../../skills/extract-listing-data/index.js";

describe("extractListingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns AiResult with parsed listing data and metadata", async () => {
    const mockData = {
      title: "Cozy Mountain Cabin",
      bedrooms: 2,
      bathrooms: 1,
      amenities: ["WiFi", "Hot tub"],
      city: "Asheville",
      state: "NC",
    };

    mockCreate.mockResolvedValue({
      model: "gpt-4o-2024-08-06",
      choices: [{ message: { content: JSON.stringify(mockData) } }],
      usage: { total_tokens: 320 },
    });

    const result = await extractListingData(
      "Some listing page content",
      "https://airbnb.com/rooms/12345"
    );

    expect(result.data).toEqual(mockData);
    expect(result.metadata).toEqual({
      model: "gpt-4o-2024-08-06",
      tokensUsed: 320,
      promptVersion: expect.any(String),
    });
    expect(mockCreate).toHaveBeenCalledOnce();

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o");
    expect(callArgs.response_format).toEqual({ type: "json_object" });
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
    expect(callArgs.messages[1].content).toContain("https://airbnb.com/rooms/12345");
    expect(callArgs.messages[1].content).toContain("Some listing page content");
  });

  it("throws when model returns no content", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: null } }],
    });

    await expect(
      extractListingData("content", "https://example.com")
    ).rejects.toThrow("No content in chat completion response");
  });

  it("throws when model returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: "not valid json" } }],
    });

    await expect(
      extractListingData("content", "https://example.com")
    ).rejects.toThrow();
  });

  it("throws when API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    await expect(
      extractListingData("content", "https://example.com")
    ).rejects.toThrow("API rate limit exceeded");
  });

  it("handles empty choices array", async () => {
    mockCreate.mockResolvedValue({ model: "gpt-4o", choices: [] });

    await expect(
      extractListingData("content", "https://example.com")
    ).rejects.toThrow();
  });
});
