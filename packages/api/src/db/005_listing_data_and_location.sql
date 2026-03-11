-- Add address fields, scraped data, and location profile to properties
alter table str_renovator.properties
  add column if not exists address_line1 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip_code text,
  add column if not exists country text default 'US',
  add column if not exists scraped_data jsonb,
  add column if not exists location_profile jsonb;

-- Expand scrape_jobs status constraint to include new phases
alter table str_renovator.scrape_jobs
  drop constraint if exists scrape_jobs_status_check;

alter table str_renovator.scrape_jobs
  add constraint scrape_jobs_status_check
    check (status in ('pending', 'scraping', 'extracting_data', 'downloading', 'researching_location', 'completed', 'failed'));

-- Add tracking columns for new scrape phases
alter table str_renovator.scrape_jobs
  add column if not exists data_extracted boolean default false,
  add column if not exists location_researched boolean default false;
