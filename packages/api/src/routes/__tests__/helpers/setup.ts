import { createSupabaseMock, type MockSupabase } from "./supabase-mock.js";
import { makeUser } from "./fixtures.js";

// ── Shared mock instances (created via vi.hoisted in each test file) ──

export const mockSupabase: MockSupabase = createSupabaseMock();

let currentUserId: string | null = "clerk_test_123";

export function setMockUserId(id: string | null) {
  currentUserId = id;
}
export function getMockUserId() {
  return currentUserId;
}

export function getClerkAuth() {
  return { userId: currentUserId };
}

export const mockQueueService = {
  enqueueAnalysis: vi.fn().mockResolvedValue(undefined),
  enqueueRenovation: vi.fn().mockResolvedValue(undefined),
  enqueueActionImage: vi.fn().mockResolvedValue(undefined),
  enqueueScrape: vi.fn().mockResolvedValue(undefined),
  enqueueLocationResearch: vi.fn().mockResolvedValue(undefined),
};

export const mockStorageService = {
  uploadPhoto: vi.fn().mockResolvedValue("mock/storage/path.jpg"),
  downloadPhoto: vi.fn().mockResolvedValue(Buffer.from("fake")),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  getSignedUrl: vi.fn().mockResolvedValue("https://mock-signed-url.com/photo"),
};

export const mockEnv = {
  port: 3001,
  nodeEnv: "test",
  isDev: false,
  supabaseUrl: "https://test.supabase.co",
  supabaseServiceRoleKey: "test-service-role-key",
  openaiApiKey: "test-openai-key",
  clerkSecretKey: "test-clerk-secret",
  clerkWebhookSecret: "whsec_test_secret",
  redisUrl: "redis://localhost:6379",
  frontendUrl: "http://localhost:5173",
  debugMode: false,
};

// ── Reset helper ─────────────────────────────────────────────────────

export function resetAllMocks() {
  mockSupabase._reset();
  currentUserId = "clerk_test_123";
  vi.clearAllMocks();
  // Re-apply default resolved values after clearAllMocks
  mockStorageService.uploadPhoto.mockResolvedValue("mock/storage/path.jpg");
  mockStorageService.downloadPhoto.mockResolvedValue(Buffer.from("fake"));
  mockStorageService.deletePhoto.mockResolvedValue(undefined);
  mockStorageService.getSignedUrl.mockResolvedValue("https://mock-signed-url.com/photo");
  mockQueueService.enqueueAnalysis.mockResolvedValue(undefined);
  mockQueueService.enqueueRenovation.mockResolvedValue(undefined);
  mockQueueService.enqueueActionImage.mockResolvedValue(undefined);
  mockQueueService.enqueueScrape.mockResolvedValue(undefined);
  mockQueueService.enqueueLocationResearch.mockResolvedValue(undefined);
}

// ── Default auth enqueue helper ──────────────────────────────────────

export function enqueueAuthUser(overrides?: Record<string, unknown>) {
  mockSupabase._enqueue({ data: makeUser(overrides as any), error: null });
}
