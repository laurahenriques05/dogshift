begin;
-- Recoverable folder deletion only: never remove Storage objects or visit links.
alter table public.health_document_folders add column deleted_at timestamptz;
create function public.manage_health_document_folder(p_household uuid,p_folder uuid,p_action text,p_name text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare target public.health_document_folders;
begin
 if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied'; end if;
 if p_action not in ('rename','delete','restore') or p_action is null then raise exception 'Invalid folder action'; end if;
 if p_action='rename' and (p_name is null or char_length(btrim(p_name)) not between 1 and 80) then raise exception 'Enter a folder name of 1–80 characters'; end if;
 -- Serialize creation of the virtual General metadata with other folder actions.
 perform 1 from public.households where id=p_household for update;
 if p_folder is null then
  select * into target from public.health_document_folders where household_id=p_household and is_default for update;
  if not found then
   insert into public.health_document_folders(household_id,name,is_default,created_by) values(p_household,'General',true,auth.uid()) returning * into target;
  end if;
 else
  select * into target from public.health_document_folders where id=p_folder and household_id=p_household for update;
  if not found then raise exception 'Folder unavailable'; end if;
 end if;
 if p_action='rename' then update public.health_document_folders set name=btrim(p_name) where id=target.id;
 elsif p_action='delete' then update public.health_document_folders set deleted_at=coalesce(deleted_at,clock_timestamp()) where id=target.id;
 else update public.health_document_folders set deleted_at=null where id=target.id;
 end if;
 return target.id;
end;
$$;
revoke all on function public.manage_health_document_folder(uuid,uuid,text,text) from public,anon;
grant execute on function public.manage_health_document_folder(uuid,uuid,text,text) to authenticated;
-- Current members manage shared folder organization; existing private file permissions
-- and direct column grants remain unchanged. Identity and household cannot be changed.
commit;
