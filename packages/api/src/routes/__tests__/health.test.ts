// vi.mock calls are hoisted above imports. The factory functions run before
// any import, so they must NOT reference module-level variables from other
// files. Instead, we import the shared instances AFTER the mocks are set up
// and use dynamic imports inside factories where needed.

vi.mock("../../config/env.js", () => ({
  env: {
    port: 3001, nodeEnv: "test", isDev: false,
    supabaseUrl: "https://test.supabase.co",
    supabaseServiceRoleKey: "test-key",
    openaiApiKey: "test-openai-key",
    clerkSecretKey: "test-clerk-secret",
    clerkWebhookSecret: "whsec_test_secret",
    redisUrl: "redis://localhost:6379",
    frontendUrl: "http://localhost:5173",
    debugMode: false,
  },
}));

vi.mock("../../config/supabase.js", async () => {
  const { createSupabaseMock } = await import("./helpers/supabase-mock.js");
  return { supabase: createSupabaseMock() };
});

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: "clerk_test_123" }),
}));

vi.mock("../../config/queue.js", () => ({
  queueConnection: {},
  analysisQueue: { add: vi.fn() },
  renovationQueue: { add: vi.fn() },
  scrapeQueue: { add: vi.fn() },
  actionImageQueue: { add: vi.fn() },
  locationResearchQueue: { add: vi.fn() },
}));

vi.mock("../../services/queue.service.js", () => ({
  enqueueAnalysis: vi.fn(),
  enqueueRenovation: vi.fn(),
  enqueueActionImage: vi.fn(),
  enqueueScrape: vi.fn(),
  enqueueLocationResearch: vi.fn(),
}));

vi.mock("../../services/storage.service.js", () => ({
  uploadPhoto: vi.fn(),
  downloadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("../../config/openai.js", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  toFile: vi.fn(),
}));

import request from "supertest";
import app from "../../app.js";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("requires no authentication", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });
});
