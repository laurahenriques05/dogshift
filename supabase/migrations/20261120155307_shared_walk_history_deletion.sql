-- Household members may remove completed walks; restoration remains author-only.
begin;
create or replace function public.set_walk_deleted(p_walk uuid,p_deleted boolean) returns void
language plpgsql security definer set search_path='' as $$
declare w public.walks;
begin
 select * into w from public.walks where id=p_walk for update;
 if auth.uid() is null or w.id is null or not private.is_member(w.household_id) then
  raise exception 'Household member access required' using errcode='42501';
 end if;
 if p_deleted is null then raise exception 'Deletion choice required' using errcode='22023'; end if;
 if not p_deleted and w.walker_id is distinct from auth.uid() then
  raise exception 'Walker access required to restore' using errcode='42501';
 end if;
 if w.ended_at is null then raise exception 'Finish the walk before deleting it'; end if;
 update public.walks set deleted_at=case when p_deleted then coalesce(deleted_at,clock_timestamp()) else null end where id=w.id;
end; $$;
revoke all on function public.set_walk_deleted(uuid,boolean) from public,anon;
grant execute on function public.set_walk_deleted(uuid,boolean) to authenticated;
commit;
