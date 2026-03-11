/**
 * @module storage.connector
 * @capability Storage connector interface
 * @layer Execution
 *
 * Defines the contract for file storage operations (upload, download, delete,
 * signed URLs). Implementations wrap specific providers (Supabase Storage,
 * S3, etc.) behind this interface for testability and swappability.
 *
 * @see supabase-storage.connector.ts — Supabase Storage implementation
 */

export interface StorageConnector {
  upload(
    buffer: Buffer,
    path: string,
    mimeType: string
  ): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  getSignedUrlOrNull(
    path: string | null | undefined
  ): Promise<string | null>;
}
