# Epic 05: Extract Connector Abstractions

## Summary

Wrap external dependencies (OpenAI, Supabase Storage, BullMQ) behind connector interfaces. Services and skills import the interface, not the client directly. This enables: swapping providers, easier testing (mock at interface boundary), and centralized error normalization.

## Why

Currently:
- `openai` client is imported directly in `analysis.service.ts`, `batch.service.ts`, `renovation.service.ts`, `report.service.ts`, `llm.service.ts`
- `supabase` client is imported directly in `storage.service.ts` and all 10 repository files
- Rate limiters are scattered (`chatCompletionLimiter`, `imageGenerationLimiter`)
- To test any service, you must mock the global OpenAI/Supabase singletons

## Current State

### OpenAI Usage

| File | API | Method |
|------|-----|--------|
| `llm.service.ts` | Chat completions (JSON mode) | `openai.chat.completions.create()` |
| `analysis.service.ts` | Chat completions (vision) | `openai.chat.completions.create()` with image content |
| `batch.service.ts` | Chat completions (aggregation) | `openai.chat.completions.create()` |
| `report.service.ts` | Chat completions (text) | `openai.chat.completions.create()` |
| `renovation.service.ts` | Image edit | `openai.images.edit()` |

All use rate limiters from `config/rate-limiter.ts`:
- `chatCompletionLimiter`: p-limit(5) for text/vision calls
- `imageGenerationLimiter`: p-limit configured per CONCURRENCY constant

### Supabase Storage Usage

| File | Operations |
|------|-----------|
| `storage.service.ts` | upload, download, delete, getSignedUrl, getSignedUrlOrNull |

### BullMQ Usage

| File | Operations |
|------|-----------|
| `queue.service.ts` | 5 enqueue functions, each calling `queue.add()` |
| `config/queue.ts` | Queue creation, connection setup |
| `jobs/worker.ts` | Worker creation, failure handling |

## Scope

### 1. AI Connector

**File:** `packages/api/src/connectors/ai.connector.ts`

```typescript
interface AiConnector {
  chatCompletion(options: {
    systemPrompt: string;
    userMessage: string | ChatCompletionContentPart[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: "json_object" };
  }): Promise<ChatCompletionResponse>;

  imageEdit(options: {
    image: Buffer;
    prompt: string;
    size?: string;
    responseFormat?: string;
  }): Promise<ImageEditResponse>;
}
```

**Implementation:** `packages/api/src/connectors/openai.connector.ts`

Wraps the current OpenAI client + rate limiters. All skills import from the connector interface.

### 2. Storage Connector

**File:** `packages/api/src/connectors/storage.connector.ts`

```typescript
interface StorageConnector {
  upload(buffer: Buffer, path: string, mimeType: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  getSignedUrlOrNull(path: string | null | undefined): Promise<string | null>;
}
```

**Implementation:** `packages/api/src/connectors/supabase-storage.connector.ts`

Wraps current `storage.service.ts` functions.

### 3. Queue Connector

**File:** `packages/api/src/connectors/queue.connector.ts`

```typescript
interface QueueConnector {
  enqueue(queueName: string, jobName: string, data: unknown, options?: JobOptions): Promise<string>;
}
```

**Implementation:** `packages/api/src/connectors/bullmq.connector.ts`

Wraps current queue enqueue logic with consistent retry/backoff config.

### 4. Update Consumers

| Consumer | Current Import | New Import |
|----------|---------------|------------|
| All skills using `executeJsonChatCompletion` | `config/openai` + `config/rate-limiter` | `connectors/ai` |
| `renovation.service.ts` (edit-image skill) | `config/openai` + `config/rate-limiter` | `connectors/ai` |
| `storage.service.ts` | `config/supabase` | `connectors/storage` |
| `queue.service.ts` | `config/queue` | `connectors/queue` |
| All route files using `storageService.*` | `services/storage.service` | No change (storage service wraps connector) |

## Files to Create

| File | Lines (est.) |
|------|-------------|
| `packages/api/src/connectors/ai.connector.ts` | ~30 (interface) |
| `packages/api/src/connectors/openai.connector.ts` | ~60 (implementation) |
| `packages/api/src/connectors/storage.connector.ts` | ~20 (interface) |
| `packages/api/src/connectors/supabase-storage.connector.ts` | ~50 (implementation) |
| `packages/api/src/connectors/queue.connector.ts` | ~15 (interface) |
| `packages/api/src/connectors/bullmq.connector.ts` | ~40 (implementation) |
| `packages/api/src/connectors/index.ts` | ~10 |

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/services/llm.service.ts` | Import from AI connector instead of openai/rate-limiter |
| `packages/api/src/services/storage.service.ts` | Delegate to storage connector |
| `packages/api/src/services/queue.service.ts` | Delegate to queue connector |
| Test setup files | Mock at connector boundary instead of global singletons |

## Acceptance Criteria

- [ ] 3 connector interfaces defined (AI, Storage, Queue)
- [ ] 3 concrete implementations (OpenAI, Supabase Storage, BullMQ)
- [ ] All AI skills import through connector, not direct client
- [ ] Storage service delegates to connector
- [ ] Queue service delegates to connector
- [ ] Existing behavior unchanged
- [ ] Test files can mock at connector interface boundary

## Dependencies

- Epic 03 (AI Skills) — skills are the main consumers of the AI connector

## Estimated Complexity

Low-Medium — interface extraction with clear implementation wrapping existing code.
