import { supabase } from "../config/supabase.js";

const BUCKET = "photos";

export async function uploadPhoto(
  buffer: Buffer,
  userId: string,
  propertyId: string,
  filename: string,
  mimeType: string
): Promise<string> {
  const path = `${userId}/${propertyId}/${filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function downloadPhoto(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deletePhoto(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
