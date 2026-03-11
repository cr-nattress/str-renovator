import type { AnalysisStatus } from "./enums.js";

export type SSEEvent =
  | { type: "status"; status: AnalysisStatus }
  | { type: "progress"; completed: number; total: number }
  | { type: "photo_complete"; photoId: string; room: string }
  | { type: "renovation_complete"; photoId: string; renovationId: string }
  | { type: "batch_progress"; batchIndex: number; totalBatches: number; batchStatus: "completed" | "failed" }
  | { type: "error"; message: string }
  | { type: "done" };

export type StreamEvent =
  | { type: "status"; status: string; message?: string }
  | { type: "progress"; completed: number; total: number; message?: string }
  | { type: "error"; message: string }
  | { type: "done"; message?: string };
