/**
 * @module supabase-storage.connector
 * @capability Supabase Storage connector implementation
 * @layer Execution
 *
 * Wraps Supabase Storage behind the StorageConnector interface.
 * Handles upload, download, delete, and signed URL operations
 * against the configured bucket.
 *
 * @see storage.connector.ts — interface definition
 * @see config/supabase.ts — Supabase client singleton
 */

import { supabase } from "../config/supabase.js";
import type { StorageConnector } from "./storage.connector.js";

const BUCKET = "photos";

class SupabaseStorageConnector implements StorageConnector {
  async upload(
    buffer: Buffer,
    path: string,
    mimeType: string
  ): Promise<string> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return path;
  }

  async download(path: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(path);
    if (error || !data) {
      const msg =
        error?.message ??
        (error ? JSON.stringify(error) : "no data returned");
      throw new Error(`Storage download failed for "${path}": ${msg}`);
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !data)
      throw new Error(`Signed URL failed: ${error?.message}`);
    return data.signedUrl;
  }

  async getSignedUrlOrNull(
    path: string | null | undefined
  ): Promise<string | null> {
    if (!path) return null;
    try {
      return await this.getSignedUrl(path);
    } catch {
      return null;
    }
  }
}

export const supabaseStorageConnector: StorageConnector =
  new SupabaseStorageConnector();
