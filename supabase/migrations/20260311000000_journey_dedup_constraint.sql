-- Deduplicate existing rows: keep latest updated_at per (property_id, lower(title))
DELETE FROM str_renovator.design_journey_items a
USING str_renovator.design_journey_items b
WHERE a.property_id = b.property_id
  AND lower(a.title) = lower(b.title)
  AND a.id <> b.id
  AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.id < b.id));

-- Add unique constraint via functional index
CREATE UNIQUE INDEX idx_journey_property_title_unique
  ON str_renovator.design_journey_items (property_id, lower(title));
