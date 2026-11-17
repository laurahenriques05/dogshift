begin;
-- The default folder remains a virtual grouping of legacy/unassigned files.
-- Persist only its display label; no Storage objects are moved.
alter table public.health_document_folders add column is_default boolean not null default false;
create unique index health_one_default_folder on public.health_document_folders(household_id) where is_default;
drop policy health_folder_create on public.health_document_folders;
create policy health_folder_create on public.health_document_folders for insert to authenticated
 with check(private.is_member(household_id) and created_by=auth.uid()
 and (not is_default or private.is_owner(household_id)));
-- Existing UPDATE(name) grant means members cannot change the default flag.
commit;
