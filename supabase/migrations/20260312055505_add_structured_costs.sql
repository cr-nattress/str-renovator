-- Add numeric cost range columns to design_journey_items for structured aggregation.
-- The existing estimated_cost text column is preserved for display.

ALTER TABLE str_renovator.design_journey_items
  ADD COLUMN estimated_cost_min numeric(10,2),
  ADD COLUMN estimated_cost_max numeric(10,2);

COMMENT ON COLUMN str_renovator.design_journey_items.estimated_cost_min
  IS 'Lower bound of estimated cost range (dollars). Populated from AI structured output.';
COMMENT ON COLUMN str_renovator.design_journey_items.estimated_cost_max
  IS 'Upper bound of estimated cost range (dollars). Populated from AI structured output.';
