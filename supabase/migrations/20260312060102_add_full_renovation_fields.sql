-- Add full-renovation composite image fields to analysis_photos.
-- One composite image per analysis_photo showing all action items applied together.

ALTER TABLE str_renovator.analysis_photos
  ADD COLUMN full_renovation_storage_path text,
  ADD COLUMN full_renovation_status text NOT NULL DEFAULT 'pending';

COMMENT ON COLUMN str_renovator.analysis_photos.full_renovation_storage_path
  IS 'Supabase Storage path for the composite full-renovation image.';
COMMENT ON COLUMN str_renovator.analysis_photos.full_renovation_status
  IS 'Status of full-renovation image generation: pending | processing | completed | failed.';
