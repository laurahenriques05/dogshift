begin;
-- Keep a hidden tombstone so the virtual General folder cannot reappear.
-- Storage objects are never deleted directly through SQL.
alter table public.health_document_folders add column purged_at timestamptz;
create function public.permanently_delete_health_folder(p_household uuid,p_folder uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.health_document_folders;
begin
 if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied'; end if;
 perform 1 from public.households where id=p_household for update;
 select * into target from public.health_document_folders where id=p_folder and household_id=p_household for update;
 if not found or target.deleted_at is null or target.purged_at is not null then raise exception 'Deleted folder unavailable'; end if;
 if exists (
  select 1 from storage.objects o where o.bucket_id='health-documents'
  and split_part(o.name,'/',1)=p_household::text
  and (
   (not target.is_default and substring(split_part(o.name,'/',3) from 39 for 45)='folder_'||target.id::text||'--')
   or (target.is_default and not exists (
    select 1 from public.health_document_folders f where f.household_id=p_household
    and substring(split_part(o.name,'/',3) from 39 for 45)='folder_'||f.id::text||'--'
   ))
  )
 ) then raise exception 'Delete the documents inside this folder first'; end if;
 update public.health_document_folders set purged_at=clock_timestamp() where id=target.id;
 return target.id;
end;
$$;
revoke all on function public.permanently_delete_health_folder(uuid,uuid) from public,anon;
grant execute on function public.permanently_delete_health_folder(uuid,uuid) to authenticated;
create function private.protect_purged_health_folder() returns trigger language plpgsql set search_path='' as $$
begin
 if old.purged_at is not null then raise exception 'This folder was permanently deleted'; end if;
 return new;
end;
$$;
create trigger protect_purged_health_folder before update on public.health_document_folders
for each row execute function private.protect_purged_health_folder();
-- Serialize uploads with folder actions and reject uploads into archived folders.
create function private.guard_health_folder_upload() returns trigger
language plpgsql security definer set search_path='' as $$
declare home uuid; folder_id text; target public.health_document_folders;
begin
 if new.bucket_id<>'health-documents' then return new; end if;
 home:=split_part(new.name,'/',1)::uuid;
 perform 1 from public.households where id=home for update;
 folder_id:=substring(split_part(new.name,'/',3) from 39 for 45);
 if folder_id like 'folder_%' then
  select * into target from public.health_document_folders
  where household_id=home and 'folder_'||id::text||'--'=folder_id;
  if not found then raise exception 'Folder unavailable'; end if;
 else
  select * into target from public.health_document_folders where household_id=home and is_default;
 end if;
 if target.deleted_at is not null or target.purged_at is not null then
  raise exception 'Restore this folder before adding files';
 end if;
 return new;
end;
$$;
create trigger guard_health_folder_upload before insert or update on storage.objects
for each row execute function private.guard_health_folder_upload();
commit;
