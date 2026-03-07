ALTER TABLE str_renovator.design_journey_items
  ADD COLUMN image_storage_path text,
  ADD COLUMN image_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN source_photo_id uuid REFERENCES str_renovator.photos(id);
