/**
 * @module storage.service
 * @capability Photo storage operations
 * @layer Execution
 *
 * Provides domain-specific storage operations (uploadPhoto, downloadPhoto, etc.)
 * by delegating to the StorageConnector abstraction.
 *
 * @see connectors/storage.connector.ts — interface
 * @see connectors/supabase-storage.connector.ts — implementation
 */

import { supabaseStorageConnector } from "../connectors/supabase-storage.connector.js";

export async function uploadPhoto(
  buffer: Buffer,
  userId: string,
  propertyId: string,
  filename: string,
  mimeType: string
): Promise<string> {
  const path = `${userId}/${propertyId}/${filename}`;
  return supabaseStorageConnector.upload(buffer, path, mimeType);
}

export async function downloadPhoto(storagePath: string): Promise<Buffer> {
  return supabaseStorageConnector.download(storagePath);
}

export async function deletePhoto(storagePath: string): Promise<void> {
  return supabaseStorageConnector.delete(storagePath);
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  return supabaseStorageConnector.getSignedUrl(storagePath);
}

/** Returns a signed URL or null if the storage object is missing — eliminates repeated try/catch in routes */
export async function getSignedUrlOrNull(storagePath: string | null | undefined): Promise<string | null> {
  return supabaseStorageConnector.getSignedUrlOrNull(storagePath);
}
