-- STR Photo Renovator — Database Schema
-- Run against Supabase Postgres
-- All objects live in the "str_renovator" schema to isolate from other apps.

-- ── Schema ────────────────────────────────────────────────────────────
create schema if not exists str_renovator;

-- ── Updated_at trigger function ───────────────────────────────────────
-- Created first so tables can reference it in triggers below.
create or replace function str_renovator.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Users ───────────────────────────────────────────────────────────
create table str_renovator.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text unique not null,
  name text,
  avatar_url text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'business')),
  analyses_this_month int not null default 0,
  current_period_start timestamptz not null default date_trunc('month', now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_clerk_id on str_renovator.users(clerk_id);

create trigger trg_users_updated_at
  before update on str_renovator.users
  for each row execute function str_renovator.update_updated_at();

-- ── Properties ──────────────────────────────────────────────────────
create table str_renovator.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  name text not null,
  description text,
  listing_url text,
  context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_user_id on str_renovator.properties(user_id);

create trigger trg_properties_updated_at
  before update on str_renovator.properties
  for each row execute function str_renovator.update_updated_at();

-- ── Photos ──────────────────────────────────────────────────────────
create table str_renovator.photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references str_renovator.properties(id) on delete cascade,
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  source text not null default 'upload' check (source in ('upload', 'scrape')),
  created_at timestamptz not null default now()
);

create index idx_photos_property_id on str_renovator.photos(property_id);

-- ── Analyses ────────────────────────────────────────────────────────
create table str_renovator.analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references str_renovator.properties(id) on delete cascade,
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'analyzing', 'generating_images', 'generating_reports', 'completed', 'failed')),
  property_assessment text,
  style_direction text,
  raw_json jsonb,
  total_photos int not null default 0,
  completed_photos int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_analyses_property_id on str_renovator.analyses(property_id);
create index idx_analyses_user_id on str_renovator.analyses(user_id);

create trigger trg_analyses_updated_at
  before update on str_renovator.analyses
  for each row execute function str_renovator.update_updated_at();

-- ── Analysis Photos ─────────────────────────────────────────────────
create table str_renovator.analysis_photos (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references str_renovator.analyses(id) on delete cascade,
  photo_id uuid not null references str_renovator.photos(id) on delete cascade,
  room text not null,
  strengths text[] not null default '{}',
  renovations text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  report text,
  created_at timestamptz not null default now()
);

create index idx_analysis_photos_analysis_id on str_renovator.analysis_photos(analysis_id);

-- ── Renovations ─────────────────────────────────────────────────────
create table str_renovator.renovations (
  id uuid primary key default gen_random_uuid(),
  analysis_photo_id uuid not null references str_renovator.analysis_photos(id) on delete cascade,
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  storage_path text,
  iteration int not null default 1,
  parent_renovation_id uuid references str_renovator.renovations(id) on delete set null,
  feedback_context text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index idx_renovations_analysis_photo_id on str_renovator.renovations(analysis_photo_id);

-- ── Feedback ────────────────────────────────────────────────────────
create table str_renovator.feedback (
  id uuid primary key default gen_random_uuid(),
  renovation_id uuid not null references str_renovator.renovations(id) on delete cascade,
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  rating text not null check (rating in ('like', 'dislike')),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_feedback_renovation_id on str_renovator.feedback(renovation_id);

-- ── Design Journey Items ────────────────────────────────────────────
create table str_renovator.design_journey_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references str_renovator.properties(id) on delete cascade,
  analysis_id uuid references str_renovator.analyses(id) on delete set null,
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  priority int not null default 0,
  title text not null,
  description text,
  estimated_cost text,
  actual_cost numeric(10,2),
  impact text not null check (impact in ('high', 'medium', 'low')),
  rooms_affected text[] not null default '{}',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_journey_property_id on str_renovator.design_journey_items(property_id);

create trigger trg_journey_updated_at
  before update on str_renovator.design_journey_items
  for each row execute function str_renovator.update_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────
-- Note: RLS policies are enforced by Supabase when accessed via the client SDK.
-- Our Express API uses the service_role key which bypasses RLS,
-- but we enforce tenant isolation in our middleware layer.

alter table str_renovator.users enable row level security;
alter table str_renovator.properties enable row level security;
alter table str_renovator.photos enable row level security;
alter table str_renovator.analyses enable row level security;
alter table str_renovator.analysis_photos enable row level security;
alter table str_renovator.renovations enable row level security;
alter table str_renovator.feedback enable row level security;
alter table str_renovator.design_journey_items enable row level security;

-- ── Grant access to Supabase roles ──────────────────────────────────
-- The service_role needs full access; authenticated/anon get nothing
-- (all access goes through our Express API with service_role key).

grant usage on schema str_renovator to service_role;
grant all privileges on all tables in schema str_renovator to service_role;
grant all privileges on all sequences in schema str_renovator to service_role;
alter default privileges in schema str_renovator
  grant all on tables to service_role;
alter default privileges in schema str_renovator
  grant all on sequences to service_role;

-- ── Storage bucket ──────────────────────────────────────────────────
-- Photos bucket (private) — Supabase Storage lives in its own schema,
-- so this stays in storage.buckets as normal.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
