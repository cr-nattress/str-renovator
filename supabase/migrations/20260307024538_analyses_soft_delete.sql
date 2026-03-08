-- Add soft-delete column to analyses
ALTER TABLE str_renovator.analyses
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Partial index so filtered queries stay fast
CREATE INDEX idx_analyses_active
  ON str_renovator.analyses (property_id, created_at DESC)
  WHERE is_active = true;
