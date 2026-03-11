-- Add review analysis column to properties
alter table str_renovator.properties
  add column if not exists review_analysis jsonb;

-- Add reviews tracking to scrape jobs
alter table str_renovator.scrape_jobs
  add column if not exists reviews_analyzed boolean default false;

-- Expand scrape_jobs status constraint to include new phase
alter table str_renovator.scrape_jobs
  drop constraint if exists scrape_jobs_status_check;

alter table str_renovator.scrape_jobs
  add constraint scrape_jobs_status_check
    check (status in ('pending', 'scraping', 'extracting_data', 'analyzing_reviews', 'downloading', 'researching_location', 'synthesizing', 'completed', 'failed'));
