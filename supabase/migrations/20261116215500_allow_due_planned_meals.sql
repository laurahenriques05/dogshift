begin;

create or replace function public.save_meal_result(
 p_household uuid,
 p_id uuid,
 p_items jsonb,
 p_at timestamptz,
 p_source text default 'app',
 p_allow_duplicate boolean default false,
 p_routine_meal uuid default null,
 p_outcome text default 'given',
 p_notes text default '',
 p_remove boolean default false
) returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_allow_duplicate boolean := coalesce(p_allow_duplicate,false);
 v_timezone text;
 v_meal_time time;
 v_local_day date;
begin
 if p_routine_meal is not null and not v_allow_duplicate and not p_remove then
  select h.timezone,(meal.value->>'time')::time
   into v_timezone,v_meal_time
   from public.households h
   join public.feeding_settings settings on settings.household_id=h.id
   cross join lateral jsonb_array_elements(settings.meal_plan) meal(value)
   where h.id=p_household and (meal.value->>'id')::uuid=p_routine_meal;

  if found and p_at is not null then
   v_local_day := (p_at at time zone v_timezone)::date;
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household::text||':'||p_routine_meal::text||':'||v_local_day::text,0));

   if exists(
    select 1 from public.feeding_meal_events event
     where event.household_id=p_household
      and event.id<>p_id
      and event.routine_meal_id=p_routine_meal
      and event.deleted_at is null
      and (event.occurred_at at time zone v_timezone)::date=v_local_day
   ) then
    raise exception 'DUPLICATE_MEAL: This planned meal already has a record today. Check the checklist before recording an extra meal.';
   end if;

   if (p_at at time zone v_timezone)::time>=v_meal_time then
    v_allow_duplicate := true;
   end if;
  end if;
 end if;

 return private.save_meal_result(p_household,p_id,p_items,p_at,p_source,v_allow_duplicate,p_routine_meal,p_outcome,p_notes,p_remove);
end
$$;

revoke all on function public.save_meal_result(uuid,uuid,jsonb,timestamptz,text,boolean,uuid,text,text,boolean) from public,anon;
grant execute on function public.save_meal_result(uuid,uuid,jsonb,timestamptz,text,boolean,uuid,text,text,boolean) to authenticated;

commit;
