ALTER TABLE str_renovator.photos
  ADD COLUMN display_name text,
  ADD COLUMN description text,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN constraints text[] NOT NULL DEFAULT '{}';
