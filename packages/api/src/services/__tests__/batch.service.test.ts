import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockInsertMany = vi.fn();
const mockUpdateStatus = vi.fn();
const mockListCompleted = vi.fn();
const mockDownloadPhoto = vi.fn();
const mockAnalyzeProperty = vi.fn();
const mockAggregateBatchAnalyses = vi.fn();

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

vi.mock("../../repositories/analysis-batch.repository.js", () => ({
  insertMany: (...args: unknown[]) => mockInsertMany(...args),
  updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
  listCompleted: (...args: unknown[]) => mockListCompleted(...args),
}));

vi.mock("../storage.service.js", () => ({
  downloadPhoto: (...args: unknown[]) => mockDownloadPhoto(...args),
}));

vi.mock("../../skills/analyze-property/index.js", () => ({
  analyzeProperty: (...args: unknown[]) => mockAnalyzeProperty(...args),
}));

vi.mock("../../skills/aggregate-batch-analyses/index.js", () => ({
  aggregateBatchAnalyses: (...args: unknown[]) => mockAggregateBatchAnalyses(...args),
}));

import { chunk, createBatchRecords, processSingleBatch, aggregateBatchResults } from "../batch.service.js";

describe("chunk", () => {
  it("splits array into chunks of given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when items fit", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("createBatchRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates batch records from photo chunks", async () => {
    const photos = [
      { id: "p1", filename: "a.jpg" },
      { id: "p2", filename: "b.jpg" },
      { id: "p3", filename: "c.jpg" },
    ] as any[];

    mockInsertMany.mockResolvedValue([
      { id: "b1", batch_index: 0, photo_ids: ["p1", "p2"] },
      { id: "b2", batch_index: 1, photo_ids: ["p3"] },
    ]);

    const result = await createBatchRecords("analysis-1", photos, 2);

    expect(mockInsertMany).toHaveBeenCalledOnce();
    const rows = mockInsertMany.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0].analysis_id).toBe("analysis-1");
    expect(rows[0].batch_index).toBe(0);
    expect(rows[0].photo_ids).toEqual(["p1", "p2"]);
    expect(rows[1].batch_index).toBe(1);
    expect(result).toHaveLength(2);
  });
});

describe("processSingleBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("downloads photos, calls analysis, and updates batch status", async () => {
    const batch = {
      id: "batch-1",
      batch_index: 0,
      photo_ids: ["p1"],
      filenames: ["photo.jpg"],
    } as any;

    const photos = [
      { id: "p1", filename: "photo.jpg", storage_path: "path/photo.jpg" },
    ] as any[];

    const analysisResult = {
      data: { property_assessment: "Good" },
      metadata: { model: "gpt-4o", tokensUsed: 500, promptVersion: "v1" },
    };

    mockDownloadPhoto.mockResolvedValue(Buffer.from("image-data"));
    mockAnalyzeProperty.mockResolvedValue(analysisResult);
    mockUpdateStatus.mockResolvedValue(undefined);

    const result = await processSingleBatch(batch, photos, undefined, 1);

    expect(mockUpdateStatus).toHaveBeenCalledWith("batch-1", "processing");
    expect(mockDownloadPhoto).toHaveBeenCalledWith("path/photo.jpg");
    expect(mockAnalyzeProperty).toHaveBeenCalledOnce();
    expect(mockUpdateStatus).toHaveBeenCalledWith("batch-1", "completed", {
      result_json: analysisResult.data,
      prompt_version: "v1",
      model: "gpt-4o",
      tokens_used: 500,
    });
    expect(result).toEqual(analysisResult);
  });

  it("marks batch as failed on error", async () => {
    const batch = {
      id: "batch-2",
      batch_index: 0,
      photo_ids: ["p1"],
      filenames: ["photo.jpg"],
    } as any;

    const photos = [
      { id: "p1", filename: "photo.jpg", storage_path: "path/photo.jpg" },
    ] as any[];

    mockDownloadPhoto.mockRejectedValue(new Error("Storage error"));
    mockUpdateStatus.mockResolvedValue(undefined);

    await expect(
      processSingleBatch(batch, photos, undefined, 1)
    ).rejects.toThrow("Storage error");

    expect(mockUpdateStatus).toHaveBeenCalledWith("batch-2", "failed", {
      error: "Storage error",
    });
  });
});

describe("aggregateBatchResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns single batch result directly without aggregation call", async () => {
    const singleBatch = {
      id: "b1",
      result_json: { property_assessment: "Good", style_direction: "Modern", photos: [], action_plan: [] },
      model: "gpt-4o-2024-08-06",
      tokens_used: 500,
      prompt_version: "v1",
    };

    mockListCompleted.mockResolvedValue([singleBatch]);

    const result = await aggregateBatchResults("analysis-1");

    expect(result.data).toEqual(singleBatch.result_json);
    expect(result.metadata.model).toBe("gpt-4o-2024-08-06");
    expect(result.metadata.tokensUsed).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled(); // No aggregation API call
  });

  it("delegates to aggregateBatchAnalyses skill for multiple batch results", async () => {
    const batches = [
      {
        id: "b1",
        result_json: { property_assessment: "A", style_direction: "Modern", photos: [], action_plan: [] },
      },
      {
        id: "b2",
        result_json: { property_assessment: "B", style_direction: "Rustic", photos: [], action_plan: [] },
      },
    ];

    mockListCompleted.mockResolvedValue(batches);

    const merged = {
      property_assessment: "Combined assessment",
      style_direction: "Modern Rustic",
      photos: [],
      action_plan: [],
    };

    mockAggregateBatchAnalyses.mockResolvedValue({
      data: merged,
      metadata: { model: "gpt-4o-2024-08-06", tokensUsed: 900, promptVersion: "v1" },
    });

    const result = await aggregateBatchResults("analysis-1");

    expect(result.data).toEqual(merged);
    expect(result.metadata.model).toBe("gpt-4o-2024-08-06");
    expect(result.metadata.tokensUsed).toBe(900);
    expect(mockAggregateBatchAnalyses).toHaveBeenCalledOnce();
    expect(mockAggregateBatchAnalyses).toHaveBeenCalledWith(
      batches.map(b => b.result_json),
      "analysis-1"
    );
  });
});
