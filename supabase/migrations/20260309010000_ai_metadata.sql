-- Add AI metadata columns for tracking prompt versions, models, and token usage
ALTER TABLE str_renovator.analyses
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS tokens_used int;

ALTER TABLE str_renovator.analysis_batches
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS tokens_used int;

ALTER TABLE str_renovator.renovations
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS tokens_used int;

ALTER TABLE str_renovator.design_journey_items
  ADD COLUMN IF NOT EXISTS prompt_version text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS tokens_used int;
