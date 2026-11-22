-- Review with Maria/Laura before hosted installation: preserves real task completion
-- when source walk routes/notes are purged. No initial data deletion on installation.
begin;
create table private.walk_retention_receipts (
 occurrence_id uuid primary key references public.task_occurrences(id) on delete cascade,
 household_id uuid not null references public.households(id) on delete cascade,
 completed_at timestamptz not null,
 completed_by uuid references auth.users(id) on delete set null
);
alter table private.walk_retention_receipts enable row level security;
revoke all on private.walk_retention_receipts from public,anon,authenticated,service_role;
create or replace function private.care_completion(o public.task_occurrences)
 returns table(done_at timestamptz,done_by uuid) language sql stable security definer set search_path='' as $$
 select e.occurred_at,e.created_by from public.feeding_meal_events e
 where o.care_kind='feeding' and e.id=o.meal_event_id and e.household_id=o.household_id
 and e.routine_meal_id=o.care_meal_id and e.deleted_at is null and e.outcome<>'skipped'
 and (e.occurred_at at time zone (select timezone from public.households where id=o.household_id))::date=o.care_day
 and exists(select 1 from public.feeding_entries i where i.event_id=e.id and i.household_id=o.household_id and i.deleted_at is null and i.quantity_grams>0)
 union all
 select w.ended_at,w.walker_id from public.walks w where o.care_kind='walk' and w.id=o.walk_id
 and w.household_id=o.household_id and w.deleted_at is null and w.ended_at is not null
 union all
 select r.completed_at,r.completed_by from private.walk_retention_receipts r
 where o.care_kind='walk' and o.walk_id is null and r.occurrence_id=o.id and r.household_id=o.household_id;
$$;
create function private.purge_expired_walks() returns integer
language plpgsql security invoker set search_path='' as $$
declare w public.walks; removed integer:=0;
begin
 for w in select * from public.walks where ended_at < statement_timestamp()-interval '168 hours'
  order by ended_at,id limit 1000 for update skip locked loop
  perform 1 from public.task_occurrences where walk_id=w.id order by id for update;
  -- Minimal task proof only: no walk ID, route, distance, notes or waste is retained.
  insert into private.walk_retention_receipts(occurrence_id,household_id,completed_at,completed_by)
   select id,household_id,completed_at,completed_by from public.task_occurrences
   where walk_id=w.id and care_kind='walk' and completed_at is not null and w.deleted_at is null
   on conflict(occurrence_id) do nothing;
  delete from public.walks where id=w.id;
  removed:=removed+1;
 end loop;
 return removed;
end; $$;
revoke all on function private.purge_expired_walks() from public,anon,authenticated,service_role;
create index walks_retention_end on public.walks(ended_at,id) where ended_at is not null;
-- Never install unrelated extensions silently. If absent, rollout is incomplete until
-- the team enables pg_cron and schedules this exact command as the database owner.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('pawshare-walk-seven-day-retention','* * * * *','select private.purge_expired_walks();');
 else
  raise warning 'Walk retention job not installed: pg_cron is unavailable. Schedule private.purge_expired_walks() before claiming hosted retention is active.';
 end if;
end $$;
commit;
