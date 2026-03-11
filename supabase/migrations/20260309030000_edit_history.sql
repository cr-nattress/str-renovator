-- Edit history for AI-generated field edits (undo/rollback support)
create table str_renovator.edit_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  field_path text not null,
  previous_value jsonb,
  new_value jsonb,
  edited_by uuid references str_renovator.users(id),
  source text not null default 'user',
  created_at timestamptz default now()
);

create index idx_edit_history_entity on str_renovator.edit_history(entity_type, entity_id);
