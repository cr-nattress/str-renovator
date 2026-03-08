-- Atomic counter increment function to prevent race conditions
-- when concurrent job completions update the same row.
CREATE OR REPLACE FUNCTION str_renovator.increment_counter(
  p_table text,
  p_column text,
  p_id uuid
)
RETURNS TABLE (
  id uuid,
  completed_photos int,
  completed_batches int,
  failed_batches int,
  total_photos int,
  total_batches int,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_table = 'analyses' AND p_column = 'completed_photos' THEN
    RETURN QUERY
      UPDATE str_renovator.analyses
      SET completed_photos = str_renovator.analyses.completed_photos + 1
      WHERE str_renovator.analyses.id = p_id
      RETURNING
        str_renovator.analyses.id,
        str_renovator.analyses.completed_photos,
        str_renovator.analyses.completed_batches,
        str_renovator.analyses.failed_batches,
        str_renovator.analyses.total_photos,
        str_renovator.analyses.total_batches,
        str_renovator.analyses.status::text;
  ELSIF p_table = 'analyses' AND p_column = 'completed_batches' THEN
    RETURN QUERY
      UPDATE str_renovator.analyses
      SET completed_batches = str_renovator.analyses.completed_batches + 1
      WHERE str_renovator.analyses.id = p_id
      RETURNING
        str_renovator.analyses.id,
        str_renovator.analyses.completed_photos,
        str_renovator.analyses.completed_batches,
        str_renovator.analyses.failed_batches,
        str_renovator.analyses.total_photos,
        str_renovator.analyses.total_batches,
        str_renovator.analyses.status::text;
  ELSIF p_table = 'analyses' AND p_column = 'failed_batches' THEN
    RETURN QUERY
      UPDATE str_renovator.analyses
      SET failed_batches = str_renovator.analyses.failed_batches + 1
      WHERE str_renovator.analyses.id = p_id
      RETURNING
        str_renovator.analyses.id,
        str_renovator.analyses.completed_photos,
        str_renovator.analyses.completed_batches,
        str_renovator.analyses.failed_batches,
        str_renovator.analyses.total_photos,
        str_renovator.analyses.total_batches,
        str_renovator.analyses.status::text;
  ELSE
    RAISE EXCEPTION 'Unsupported table/column combination: %.%', p_table, p_column;
  END IF;
END;
$$;
