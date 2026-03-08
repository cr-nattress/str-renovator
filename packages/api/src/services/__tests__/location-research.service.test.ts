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

import { researchLocation } from "../location-research.service.js";

describe("researchLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns AiResult with parsed location profile and metadata", async () => {
    const mockProfile = {
      area_type: "mountain",
      area_bio: "Nestled in the Blue Ridge Mountains...",
      guest_demographics: ["Couples", "Families"],
      design_recommendations: ["Use natural wood tones"],
    };

    mockCreate.mockResolvedValue({
      model: "gpt-4o-2024-08-06",
      choices: [{ message: { content: JSON.stringify(mockProfile) } }],
      usage: { total_tokens: 450 },
    });

    const result = await researchLocation({
      city: "Asheville",
      state: "NC",
      country: "US",
    });

    expect(result.data).toEqual(mockProfile);
    expect(result.metadata).toEqual({
      model: "gpt-4o-2024-08-06",
      tokensUsed: 450,
      promptVersion: expect.any(String),
    });
    expect(mockCreate).toHaveBeenCalledOnce();

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-4o");
    expect(callArgs.response_format).toEqual({ type: "json_object" });
    expect(callArgs.messages[1].content).toContain("Asheville");
    expect(callArgs.messages[1].content).toContain("NC");
  });

  it("includes full address details in prompt", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: '{"area_type": "urban"}' } }],
      usage: { total_tokens: 100 },
    });

    await researchLocation({
      address_line1: "123 Main St",
      city: "Nashville",
      state: "TN",
      zip_code: "37201",
      country: "US",
      property_name: "Downtown Loft",
      property_type: "Entire home",
    });

    const userMsg = mockCreate.mock.calls[0][0].messages[1].content;
    expect(userMsg).toContain("123 Main St");
    expect(userMsg).toContain("Nashville");
    expect(userMsg).toContain("TN");
    expect(userMsg).toContain("37201");
    expect(userMsg).toContain("Downtown Loft");
    expect(userMsg).toContain("Entire home");
  });

  it("works with partial address (city only)", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: '{"area_type": "beach"}' } }],
      usage: { total_tokens: 80 },
    });

    const result = await researchLocation({ city: "Miami" });

    expect(result.data).toEqual({ area_type: "beach" });
    expect(mockCreate.mock.calls[0][0].messages[1].content).toContain("Miami");
  });

  it("defaults tokensUsed to 0 when usage is absent", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: '{"area_type": "rural"}' } }],
    });

    const result = await researchLocation({ city: "Test" });
    expect(result.metadata.tokensUsed).toBe(0);
  });

  it("throws when model returns no content", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: null } }],
    });

    await expect(
      researchLocation({ city: "Test" })
    ).rejects.toThrow("No response from location research");
  });

  it("throws when model returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      model: "gpt-4o",
      choices: [{ message: { content: "{invalid" } }],
    });

    await expect(researchLocation({ city: "Test" })).rejects.toThrow();
  });

  it("throws when API call fails", async () => {
    mockCreate.mockRejectedValue(new Error("Service unavailable"));

    await expect(
      researchLocation({ city: "Test" })
    ).rejects.toThrow("Service unavailable");
  });
});
