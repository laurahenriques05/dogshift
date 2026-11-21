-- Rollout candidate for team review: supersedes the two earlier, uninstalled deletion
-- proposals on the shared project. Does not change route/note/waste SELECT RLS.
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

create or replace function public.permanently_delete_walk(p_walk uuid) returns void
language plpgsql security definer set search_path='' as $$
declare w public.walks;
begin
 select * into w from public.walks where id=p_walk for update;
 if auth.uid() is null or w.id is null or not private.is_member(w.household_id) then
  raise exception 'Household member access required' using errcode='42501';
 end if;
 if w.ended_at is null then raise exception 'Finish the walk before deleting it' using errcode='22023'; end if;
 delete from public.walks where id=w.id;
end; $$;

-- Family Deleted list: only summary fields, not private GPS, notes or waste.
create function public.get_deleted_walk_history(p_household uuid)
returns table(id uuid,walker_id uuid,started_at timestamptz,ended_at timestamptz,distance_m double precision,end_reason text,pause_intervals jsonb)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_household is null or not private.is_member(p_household) then
  raise exception 'Household member access required' using errcode='42501';
 end if;
 return query select w.id,w.walker_id,w.started_at,w.ended_at,w.distance_m,w.end_reason,w.pause_intervals
 from public.walks w where w.household_id=p_household and w.deleted_at is not null and w.ended_at is not null
 order by w.started_at desc,w.id;
end; $$;
revoke all on function public.set_walk_deleted(uuid,boolean),public.permanently_delete_walk(uuid),public.get_deleted_walk_history(uuid) from public,anon;
grant execute on function public.set_walk_deleted(uuid,boolean),public.permanently_delete_walk(uuid),public.get_deleted_walk_history(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
