-- STR Photo Renovator — Database Schema
-- Run against Supabase Postgres

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Users ───────────────────────────────────────────────────────────
create table users (
  id uuid primary key default uuid_generate_v4(),
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

create index idx_users_clerk_id on users(clerk_id);

-- ── Properties ──────────────────────────────────────────────────────
create table properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  listing_url text,
  context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_user_id on properties(user_id);

-- ── Photos ──────────────────────────────────────────────────────────
create table photos (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  source text not null default 'upload' check (source in ('upload', 'scrape')),
  created_at timestamptz not null default now()
);

create index idx_photos_property_id on photos(property_id);

-- ── Analyses ────────────────────────────────────────────────────────
create table analyses (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
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

create index idx_analyses_property_id on analyses(property_id);
create index idx_analyses_user_id on analyses(user_id);

-- ── Analysis Photos ─────────────────────────────────────────────────
create table analysis_photos (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references analyses(id) on delete cascade,
  photo_id uuid not null references photos(id) on delete cascade,
  room text not null,
  strengths text[] not null default '{}',
  renovations text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  report text,
  created_at timestamptz not null default now()
);

create index idx_analysis_photos_analysis_id on analysis_photos(analysis_id);

-- ── Renovations ─────────────────────────────────────────────────────
create table renovations (
  id uuid primary key default uuid_generate_v4(),
  analysis_photo_id uuid not null references analysis_photos(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  storage_path text,
  iteration int not null default 1,
  parent_renovation_id uuid references renovations(id) on delete set null,
  feedback_context text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index idx_renovations_analysis_photo_id on renovations(analysis_photo_id);

-- ── Feedback ────────────────────────────────────────────────────────
create table feedback (
  id uuid primary key default uuid_generate_v4(),
  renovation_id uuid not null references renovations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  rating text not null check (rating in ('like', 'dislike')),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_feedback_renovation_id on feedback(renovation_id);

-- ── Design Journey Items ────────────────────────────────────────────
create table design_journey_items (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  analysis_id uuid references analyses(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
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

create index idx_journey_property_id on design_journey_items(property_id);

-- ── Row Level Security ──────────────────────────────────────────────
-- Note: RLS policies are enforced by Supabase when accessed via the client SDK.
-- Our Express API uses the service_role key which bypasses RLS,
-- but we enforce tenant isolation in our middleware layer.

alter table users enable row level security;
alter table properties enable row level security;
alter table photos enable row level security;
alter table analyses enable row level security;
alter table analysis_photos enable row level security;
alter table renovations enable row level security;
alter table feedback enable row level security;
alter table design_journey_items enable row level security;

-- ── Updated_at trigger ──────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on users for each row execute function update_updated_at();

create trigger trg_properties_updated_at
  before update on properties for each row execute function update_updated_at();

create trigger trg_analyses_updated_at
  before update on analyses for each row execute function update_updated_at();

create trigger trg_journey_updated_at
  before update on design_journey_items for each row execute function update_updated_at();
