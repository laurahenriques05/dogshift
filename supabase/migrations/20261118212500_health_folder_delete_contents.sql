begin;
alter table public.health_document_folders add column deleting_files boolean not null default false;
create or replace function private.protect_purged_health_folder() returns trigger language plpgsql set search_path='' as $$
begin
 if old.purged_at is not null then raise exception 'This folder was permanently deleted'; end if;
 if old.deleting_files and (new.deleted_at is null or not new.deleting_files) then raise exception 'Finish deleting this folder before changing it'; end if;
 return new;
end;
$$;
create function public.prepare_health_folder_deletion(p_household uuid,p_folder uuid)
returns table(folder_id uuid,document_paths text[])
language plpgsql security definer set search_path='' as $$
declare target public.health_document_folders; paths text[];
begin
 if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied'; end if;
 perform 1 from public.households where id=p_household for update;
 if p_folder is null then
  select * into target from public.health_document_folders where household_id=p_household and is_default for update;
  if not found then
   insert into public.health_document_folders(household_id,name,is_default,created_by)
   values(p_household,'General',true,auth.uid()) returning * into target;
  end if;
 else
  select * into target from public.health_document_folders where id=p_folder and household_id=p_household for update;
  if not found then raise exception 'Folder unavailable'; end if;
 end if;
 if target.purged_at is not null then raise exception 'Folder unavailable'; end if;
 select coalesce(array_agg(o.name),'{}'::text[]) into paths from storage.objects o
 where o.bucket_id='health-documents' and split_part(o.name,'/',1)=p_household::text
 and ((not target.is_default and substring(split_part(o.name,'/',3) from 39 for 45)='folder_'||target.id::text||'--')
 or (target.is_default and not exists(select 1 from public.health_document_folders f
 where f.household_id=p_household and substring(split_part(o.name,'/',3) from 39 for 45)='folder_'||f.id::text||'--')));
 if not private.is_owner(p_household) and exists(select 1 from unnest(paths) p where split_part(p,'/',2)<>auth.uid()::text)
 then raise exception 'Only the family owner can delete a folder containing documents uploaded by other members'; end if;
 update public.health_document_folders set deleted_at=coalesce(deleted_at,clock_timestamp()),deleting_files=true where id=target.id;
 return query select target.id,paths;
end;
$$;
revoke all on function public.prepare_health_folder_deletion(uuid,uuid) from public,anon;
grant execute on function public.prepare_health_folder_deletion(uuid,uuid) to authenticated;
commit;
