/**
 * @module properties.test
 * Integration tests for property CRUD routes.
 * Uses supertest against the Express app with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted before imports) ---

const mockCountByUser = vi.fn();
const mockCreate = vi.fn();
const mockListByUser = vi.fn();
const mockFindByIdAndUser = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock("../../config/env.js", () => ({
  env: {
    port: 3001, nodeEnv: "test", isDev: false,
    supabaseUrl: "https://test.supabase.co",
    supabaseServiceRoleKey: "test-key",
    openaiApiKey: "test-openai-key",
    openaiChatModel: "gpt-4o",
    openaiImageModel: "dall-e-2",
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
  analysisDlqQueue: { getJobs: vi.fn().mockResolvedValue([]) },
  renovationDlqQueue: { getJobs: vi.fn().mockResolvedValue([]) },
  scrapeDlqQueue: { getJobs: vi.fn().mockResolvedValue([]) },
  actionImageDlqQueue: { getJobs: vi.fn().mockResolvedValue([]) },
  locationResearchDlqQueue: { getJobs: vi.fn().mockResolvedValue([]) },
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

vi.mock("../../repositories/user.repository.js", () => ({
  findByClerkId: vi.fn().mockResolvedValue({
    id: "user-uuid-1",
    clerk_id: "clerk_test_123",
    email: "test@example.com",
    tier: "free",
  }),
}));

vi.mock("../../repositories/property.repository.js", () => ({
  countByUser: (...args: unknown[]) => mockCountByUser(...args),
  create: (...args: unknown[]) => mockCreate(...args),
  listByUser: (...args: unknown[]) => mockListByUser(...args),
  findByIdAndUser: (...args: unknown[]) => mockFindByIdAndUser(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
}));

import request from "supertest";
import app from "../../app.js";

const TEST_USER_ID = "user-uuid-1";

describe("Properties Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/properties", () => {
    it("creates a property and returns 201", async () => {
      const property = {
        id: "prop-1",
        name: "Mountain Cabin",
        user_id: TEST_USER_ID,
        created_at: new Date().toISOString(),
      };

      mockCountByUser.mockResolvedValue(0);
      mockCreate.mockResolvedValue(property);

      const res = await request(app)
        .post("/api/v1/properties")
        .send({ name: "Mountain Cabin" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Mountain Cabin");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Mountain Cabin", user_id: TEST_USER_ID })
      );
    });

    it("returns 400 on validation error (missing name)", async () => {
      const res = await request(app)
        .post("/api/v1/properties")
        .send({});

      expect(res.status).toBe(400);
    });

    it("returns 403 when tier limit reached", async () => {
      mockCountByUser.mockResolvedValue(3); // free tier limit

      const res = await request(app)
        .post("/api/v1/properties")
        .send({ name: "Another property" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/properties", () => {
    it("returns list of user properties", async () => {
      const properties = [
        { id: "prop-1", name: "Cabin", user_id: TEST_USER_ID },
        { id: "prop-2", name: "Beach House", user_id: TEST_USER_ID },
      ];
      mockListByUser.mockResolvedValue(properties);

      const res = await request(app).get("/api/v1/properties");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockListByUser).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe("GET /api/v1/properties/:id", () => {
    it("returns property by id", async () => {
      const property = { id: "prop-1", name: "Cabin", user_id: TEST_USER_ID };
      mockFindByIdAndUser.mockResolvedValue(property);

      const res = await request(app).get("/api/v1/properties/prop-1");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("prop-1");
      expect(mockFindByIdAndUser).toHaveBeenCalledWith("prop-1", TEST_USER_ID);
    });

    it("returns 404 when property not found", async () => {
      mockFindByIdAndUser.mockResolvedValue(null);

      const res = await request(app).get("/api/v1/properties/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/properties/:id", () => {
    it("updates property fields", async () => {
      const updated = { id: "prop-1", name: "Updated Cabin", user_id: TEST_USER_ID };
      mockUpdate.mockResolvedValue(updated);

      const res = await request(app)
        .patch("/api/v1/properties/prop-1")
        .send({ name: "Updated Cabin" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Cabin");
    });

    it("returns 404 when property not found", async () => {
      mockUpdate.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/v1/properties/nonexistent")
        .send({ name: "X" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/properties/:id", () => {
    it("deletes property and returns 204", async () => {
      mockRemove.mockResolvedValue(undefined);

      const res = await request(app).delete("/api/v1/properties/prop-1");

      expect(res.status).toBe(204);
      expect(mockRemove).toHaveBeenCalledWith("prop-1", TEST_USER_ID);
    });
  });
});
