-- Scrape job status tracking
create table str_renovator.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references str_renovator.properties(id) on delete cascade,
  user_id uuid not null references str_renovator.users(id) on delete cascade,
  listing_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'scraping', 'downloading', 'completed', 'failed')),
  total_photos int not null default 0,
  downloaded_photos int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scrape_jobs_property_id on str_renovator.scrape_jobs(property_id);

create trigger trg_scrape_jobs_updated_at
  before update on str_renovator.scrape_jobs
  for each row execute function str_renovator.update_updated_at();

alter table str_renovator.scrape_jobs enable row level security;

grant all privileges on str_renovator.scrape_jobs to service_role;
