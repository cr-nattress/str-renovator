-- Add address_line2 and property_profile columns to properties table
alter table str_renovator.properties
  add column if not exists address_line2 text,
  add column if not exists property_profile jsonb;
