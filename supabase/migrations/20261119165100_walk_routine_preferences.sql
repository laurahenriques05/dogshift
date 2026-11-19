begin;
-- Proposal only. Coordinate with Laura after walk_journal_and_daily_plan.
alter table public.walk_daily_plans add column routine_enabled boolean not null default true;
alter table public.walk_daily_plans add column estimated_times text[] not null default '{}';
create function public.set_walk_routine(p_dog uuid,p_count integer,p_times text[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare d public.dogs;
begin
 select * into d from public.dogs where id=p_dog;
 if auth.uid() is null or d.id is null or not private.is_member(d.household_id) then
  raise exception 'Member access required' using errcode='42501';
 end if;
 if p_count is not null and p_count not between 1 and 12 then raise exception 'Choose between 1 and 12 daily walks';end if;
 if p_times is null or coalesce(array_ndims(p_times),1)<>1 or cardinality(p_times)>coalesce(p_count,0)
  or exists(select 1 from unnest(p_times) t where t is null or (t<>'' and t!~'^([01][0-9]|2[0-3]):[0-5][0-9]$')) then
  raise exception 'Invalid estimated walk times';
 end if;
 insert into public.walk_daily_plans(dog_id,household_id,required_count,routine_enabled,estimated_times)
 values(d.id,d.household_id,coalesce(p_count,1),p_count is not null,p_times)
 on conflict(dog_id) do update set required_count=excluded.required_count,routine_enabled=excluded.routine_enabled,estimated_times=excluded.estimated_times;
end;$$;
revoke all on function public.set_walk_routine(uuid,integer,text[]) from public,anon;
grant execute on function public.set_walk_routine(uuid,integer,text[]) to authenticated;
-- Older clients can still save a count; they cannot retain mismatched time slots.
create or replace function public.set_walk_daily_plan(p_dog uuid,p_count integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_count is null then raise exception 'Choose between 1 and 12 daily walks';end if;
 perform public.set_walk_routine(p_dog,p_count,'{}');
end;$$;
notify pgrst,'reload schema';
commit;
