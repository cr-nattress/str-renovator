-- Fix legacy journey items stuck at "pending" with no source photo.
-- These were created before the skipped guard was added, so no image job
-- was ever enqueued — the UI polls forever waiting for them.
UPDATE str_renovator.design_journey_items
SET image_status = 'skipped'
WHERE image_status = 'pending'
  AND source_photo_id IS NULL;
