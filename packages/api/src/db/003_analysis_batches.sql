-- Migration: Add batch processing support for analyses
-- Adds analysis_batches table and batch tracking columns to analyses

-- 1. Create analysis_batches table
create table str_renovator.analysis_batches (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references str_renovator.analyses(id) on delete cascade,
  batch_index int not null,
  photo_ids uuid[] not null default '{}',
  filenames text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  result_json jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index idx_batches_analysis_id on str_renovator.analysis_batches(analysis_id);

-- 2. Add batch tracking columns to analyses
alter table str_renovator.analyses
  add column total_batches int not null default 0,
  add column completed_batches int not null default 0,
  add column failed_batches int not null default 0;

-- 3. Update status check constraint to include new statuses
alter table str_renovator.analyses
  drop constraint analyses_status_check,
  add constraint analyses_status_check
    check (status in ('pending', 'analyzing', 'aggregating', 'generating_images', 'generating_reports', 'completed', 'partially_completed', 'failed'));

-- 4. Grant access to service role
grant all on str_renovator.analysis_batches to service_role;
