begin;
-- Supersedes solar-based setup. Compatible with the existing preferences schema
-- and with databases that have already run the historical solar proposal.
create or replace function private.valid_walk_routine_times(p_count integer,p_times text[]) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_count between 1 and 12 and p_times is not null and array_ndims(p_times)=1 and cardinality(p_times)=p_count and not exists(select 1 from unnest(p_times) t where t is null or t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),false)
$$;
revoke all on function private.valid_walk_routine_times(integer,text[]) from public,anon,authenticated;
create or replace function public.set_walk_routine(p_dog uuid,p_count integer,p_times text[] default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare d public.dogs;
begin
 select * into d from public.dogs where id=p_dog;
 if auth.uid() is null or d.id is null or not private.is_member(d.household_id) then raise exception 'Member access required' using errcode='42501';end if;
 if p_count is not null then
  if not private.valid_walk_routine_times(p_count,p_times) then raise exception 'An estimated time is required for every walk';end if;
 elsif p_times is null or cardinality(p_times)<>0 then raise exception 'Invalid disabled routine';end if;
 p_times:=array(select t from unnest(p_times) with ordinality x(t,n) order by t,n);
 insert into public.walk_daily_plans(dog_id,household_id,required_count,routine_enabled,estimated_times)
 values(d.id,d.household_id,coalesce(p_count,1),p_count is not null,p_times)
 on conflict(dog_id) do update set required_count=excluded.required_count,routine_enabled=excluded.routine_enabled,estimated_times=excluded.estimated_times;
end;$$;

do $$ begin
 if to_regprocedure('public.set_walk_routine_schedule(uuid,text[],double precision,double precision,text)') is not null then
  execute 'revoke all on function public.set_walk_routine_schedule(uuid,text[],double precision,double precision,text) from public,anon,authenticated';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
