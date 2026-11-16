begin;
-- Folder metadata only. Documents remain immutable private Storage objects under
-- household/uploader/uuid--filename, retaining existing ownership and cleanup rules.
create table public.health_document_folders (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 name text not null check (name=btrim(name) and char_length(name) between 1 and 80),
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create unique index health_document_folder_name on public.health_document_folders(household_id,lower(name));
alter table public.health_document_folders enable row level security;
revoke all on public.health_document_folders from anon,authenticated;
grant select,insert on public.health_document_folders to authenticated;
create policy health_folder_read on public.health_document_folders for select to authenticated
 using(private.is_member(household_id));
create policy health_folder_create on public.health_document_folders for insert to authenticated
 with check(private.is_member(household_id) and created_by=auth.uid());
-- Renaming/deletion/moving files are deliberately not granted by this migration.
commit;
