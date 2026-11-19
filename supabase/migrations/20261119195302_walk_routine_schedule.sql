begin;
-- Proposal: coordinate with Laura before hosted use. Requires routine preferences.
alter table public.walk_daily_plans add column place_latitude double precision;
alter table public.walk_daily_plans add column place_longitude double precision;
alter table public.walk_daily_plans add column place_label text;
alter table public.walk_daily_plans add constraint walk_routine_place_valid check(
 (place_latitude is null and place_longitude is null and place_label is null) or
 (place_latitude is not null and place_longitude is not null and place_label is not null and place_latitude between -90 and 90 and place_longitude between -180 and 180 and char_length(trim(place_label)) between 1 and 200));
create function private.valid_walk_routine_times(p_count integer,p_times text[]) returns boolean
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
  if not exists(select 1 from public.walk_daily_plans where dog_id=d.id and place_latitude is not null and place_longitude is not null and place_label is not null) then raise exception 'Choose the routine location before saving';end if;
 elsif p_times is null or cardinality(p_times)<>0 then raise exception 'Invalid disabled routine';end if;
 insert into public.walk_daily_plans(dog_id,household_id,required_count,routine_enabled,estimated_times)
 values(d.id,d.household_id,coalesce(p_count,1),p_count is not null,p_times)
 on conflict(dog_id) do update set required_count=excluded.required_count,routine_enabled=excluded.routine_enabled,estimated_times=excluded.estimated_times;
end;$$;
create function public.set_walk_routine_schedule(p_dog uuid,p_times text[],p_latitude double precision,p_longitude double precision,p_place text) returns void
language plpgsql security definer set search_path='' as $$
declare d public.dogs;
begin
 select * into d from public.dogs where id=p_dog;
 if auth.uid() is null or d.id is null or not private.is_member(d.household_id) then raise exception 'Member access required' using errcode='42501';end if;
 if not private.valid_walk_routine_times(cardinality(p_times),p_times) then raise exception 'An estimated time is required for every walk';end if;
 if p_latitude is null or p_longitude is null or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180) or p_place is null or char_length(trim(p_place)) not between 1 and 200 then raise exception 'Choose a valid routine location';end if;
 p_latitude:=round(p_latitude::numeric,2)::double precision;
 p_longitude:=round(p_longitude::numeric,2)::double precision;
 p_times:=array(select t from unnest(p_times) with ordinality x(t,n) order by t,n);
 insert into public.walk_daily_plans(dog_id,household_id,required_count,routine_enabled,estimated_times,place_latitude,place_longitude,place_label)
 values(d.id,d.household_id,cardinality(p_times),true,p_times,p_latitude,p_longitude,trim(p_place))
 on conflict(dog_id) do update set required_count=excluded.required_count,routine_enabled=true,estimated_times=excluded.estimated_times,place_latitude=excluded.place_latitude,place_longitude=excluded.place_longitude,place_label=excluded.place_label;
end;$$;
revoke all on function public.set_walk_routine_schedule(uuid,text[],double precision,double precision,text) from public,anon;
grant execute on function public.set_walk_routine_schedule(uuid,text[],double precision,double precision,text) to authenticated;
-- Keep legacy data untouched. Incomplete old plans are shown for explicit completion.
notify pgrst,'reload schema';
commit;
