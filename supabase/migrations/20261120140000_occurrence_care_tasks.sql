begin;
-- Proposed migration: apply once, after team review. No hosted data is changed by the client.
alter table public.task_series add column care_kind text check(care_kind in ('feeding','walk')),
 add column care_meal_id uuid,
 add constraint care_series_meal check ((care_kind='feeding' and care_meal_id is not null) or (care_kind is distinct from 'feeding' and care_meal_id is null));
alter table public.task_occurrences add column care_kind text check(care_kind in ('feeding','walk')),
 add column care_meal_id uuid,
 add column care_day date,
 add column original_assigned_to uuid references auth.users(id) on delete set null,
 add column assignment_version integer not null default 0,
 add column meal_event_id uuid unique references public.feeding_meal_events(id) on delete set null,
 add column walk_id uuid unique references public.walks(id) on delete set null,
 add constraint care_single_source check (num_nonnulls(meal_event_id,walk_id)<=1);
create unique index care_one_meal_per_day on public.task_occurrences(household_id,care_meal_id,care_day) where care_kind='feeding';
create table public.task_assignment_history (
 id uuid primary key default gen_random_uuid(), occurrence_id uuid not null references public.task_occurrences(id) on delete cascade,
 household_id uuid not null references public.households(id) on delete cascade,
 from_user uuid references auth.users(id) on delete set null, to_user uuid references auth.users(id) on delete set null,
 changed_by uuid references auth.users(id) on delete set null, changed_at timestamptz not null default clock_timestamp(),
 version integer not null, unique(occurrence_id,version)
);
alter table public.task_assignment_history enable row level security;
create policy family_read on public.task_assignment_history for select to authenticated using(private.is_member(household_id));
grant select on public.task_assignment_history to authenticated;
revoke insert,update,delete on public.task_assignment_history from authenticated,anon;

-- The source is the authority, including corrections, deletions and retries.
create function private.care_completion(o public.task_occurrences)
 returns table(done_at timestamptz,done_by uuid) language sql stable security definer set search_path='' as $$
 select e.occurred_at,e.created_by from public.feeding_meal_events e
 where o.care_kind='feeding' and e.id=o.meal_event_id and e.household_id=o.household_id
 and e.routine_meal_id=o.care_meal_id and e.deleted_at is null and e.outcome<>'skipped'
 and (e.occurred_at at time zone (select timezone from public.households where id=o.household_id))::date=o.care_day
 and exists(select 1 from public.feeding_entries i where i.event_id=e.id and i.household_id=o.household_id and i.deleted_at is null and i.quantity_grams>0)
 union all
 select w.ended_at,w.walker_id from public.walks w where o.care_kind='walk' and w.id=o.walk_id
 and w.household_id=o.household_id and w.deleted_at is null and w.ended_at is not null;
$$;
create function private.guard_care_occurrence() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.task_series; proof record; zone text;
begin
 if tg_op='INSERT' then
  select * into s from public.task_series where id=new.series_id;
  new.care_kind:=s.care_kind;new.care_meal_id:=s.care_meal_id;new.original_assigned_to:=new.assigned_to;
  select timezone into zone from public.households where id=new.household_id;
  new.care_day:=(new.due_at at time zone zone)::date;
 elsif old.care_kind is not null then
  if new.care_kind is distinct from old.care_kind or new.care_meal_id is distinct from old.care_meal_id then raise exception 'Care source cannot be changed';end if;
  if new.assigned_to is distinct from old.assigned_to then
   new.assignment_version:=old.assignment_version+1;
   insert into public.task_assignment_history(occurrence_id,household_id,from_user,to_user,changed_by,version)
   values(old.id,old.household_id,old.assigned_to,new.assigned_to,auth.uid(),new.assignment_version);
  end if;
 end if;
 if new.care_kind is not null then
  select * into proof from private.care_completion(new);
  if tg_op='UPDATE' and ((old.meal_event_id is not null and new.meal_event_id is null) or (old.walk_id is not null and new.walk_id is null)) then new.completed_at:=proof.done_at;new.completed_by:=proof.done_by;end if;
  if new.completed_at is distinct from proof.done_at or new.completed_by is distinct from proof.done_by then
   raise exception 'Open the meal or walk and save the real activity first. Reload Tasks after saving.';
  end if;
 end if;
 return new;
end; $$;
create trigger care_occurrence_guard before insert or update on public.task_occurrences for each row execute function private.guard_care_occurrence();
-- Confirming the same routine bowl in ordinary Feeding also satisfies its task.
-- No automatic meal or walk is created by this reconciliation.
create function private.reconcile_care_meal(p_event uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.feeding_meal_events; o public.task_occurrences; proof record; zone text;
begin
 select * into e from public.feeding_meal_events where id=p_event;
 select timezone into zone from public.households where id=e.household_id;
 for o in select * from public.task_occurrences where care_kind='feeding' and
  (meal_event_id=p_event or ((meal_event_id is null or exists(select 1 from public.feeding_meal_events previous where previous.id=meal_event_id and (previous.deleted_at is not null or previous.outcome='skipped'))) and household_id=e.household_id and care_meal_id=e.routine_meal_id and care_day=(e.occurred_at at time zone zone)::date)) order by id for update loop
  o.meal_event_id:=p_event;
  select * into proof from private.care_completion(o);
  if proof.done_at is not null then
   update public.task_occurrences set meal_event_id=p_event,completed_at=proof.done_at,completed_by=proof.done_by where id=o.id;
  elsif exists(select 1 from public.task_occurrences where id=o.id and meal_event_id=p_event) then
   update public.task_occurrences set completed_at=null,completed_by=null where id=o.id;
  end if;
 end loop;
end; $$;
create function private.refresh_care_source() returns trigger language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences; proof record; source uuid;
begin
 if tg_table_name='feeding_entries' then
  perform private.reconcile_care_meal(coalesce(new.event_id,old.event_id));
  if tg_op='UPDATE' and old.event_id is distinct from new.event_id then perform private.reconcile_care_meal(old.event_id);end if;
 elsif tg_table_name='feeding_meal_events' then perform private.reconcile_care_meal(coalesce(new.id,old.id));
 else
  source:=coalesce(new.id,old.id);
  for o in select * from public.task_occurrences where care_kind='walk' and walk_id=source order by id for update loop
   select * into proof from private.care_completion(o);
   update public.task_occurrences set completed_at=proof.done_at,completed_by=proof.done_by where id=o.id;
  end loop;
 end if;
 return null;
end; $$;
create function private.link_existing_care_meal() returns trigger language plpgsql security definer set search_path='' as $$
declare event_id uuid;
begin
 if new.care_kind='feeding' then
  for event_id in select e.id from public.feeding_meal_events e join public.households h on h.id=e.household_id where e.household_id=new.household_id and e.routine_meal_id=new.care_meal_id and e.deleted_at is null and (e.occurred_at at time zone h.timezone)::date=new.care_day loop
   perform private.reconcile_care_meal(event_id);
  end loop;
 end if;
 return null;
end; $$;
create trigger link_existing_care_meal after insert on public.task_occurrences for each row execute function private.link_existing_care_meal();
create trigger care_meal_changes after insert or update or delete on public.feeding_meal_events for each row execute function private.refresh_care_source();
create trigger care_meal_items after insert or update or delete on public.feeding_entries for each row execute function private.refresh_care_source();
create trigger care_walk_changes after insert or update or delete on public.walks for each row execute function private.refresh_care_source();

create function public.save_care_task(p_household uuid,p_kind text,p_title text,p_meal uuid,p_assigned_to uuid,
 p_first_due_at timestamptz,p_recurrence text default 'none',p_recurrence_every integer default 1,p_ends_on date default null,p_request uuid default gen_random_uuid())
 returns uuid language plpgsql security definer set search_path='' as $$
declare task uuid; zone text;
begin
 if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('feeding','walk') or p_title is null or char_length(trim(p_title)) not between 1 and 100 then raise exception 'Choose feeding or walking and a name';end if;
 if p_assigned_to is not null and not exists(select 1 from public.household_members where household_id=p_household and user_id=p_assigned_to) then raise exception 'Choose a current family member';end if;
 select timezone into zone from public.households where id=p_household for update;
 perform 1 from public.household_members where household_id=p_household and user_id=auth.uid() for key share;
 if not found then raise exception 'Family access denied' using errcode='42501';end if;
 if p_assigned_to is not null then
  perform 1 from public.household_members where household_id=p_household and user_id=p_assigned_to for key share;
  if not found then raise exception 'Choose a current family member';end if;
 end if;
 if p_kind='feeding' then
  if not exists(select 1 from public.feeding_settings f cross join lateral jsonb_array_elements(f.meal_plan) meal where f.household_id=p_household and meal->>'id'=p_meal::text) then raise exception 'Choose a saved Feeding meal. Set the routine in Feeding first.';end if;
 elsif p_meal is not null then raise exception 'A walk cannot have a meal';end if;
 if p_first_due_at is null or not isfinite(p_first_due_at) or p_recurrence is null or p_recurrence not in ('none','daily','weekly','monthly') or p_recurrence_every is null or p_recurrence_every not between 1 and 52 or (p_recurrence='none' and (p_recurrence_every<>1 or p_ends_on is not null)) or p_ends_on<(p_first_due_at at time zone zone)::date then raise exception 'Invalid task schedule';end if;
 if p_request is null then raise exception 'Reload the task form before saving';end if;
 select id into task from public.task_series where id=p_request;
 if found then
  if exists(select 1 from public.task_series where id=task and household_id=p_household and created_by=auth.uid() and archived_at is null and care_kind=p_kind and title=trim(p_title) and care_meal_id is not distinct from p_meal and assigned_to is not distinct from p_assigned_to and first_due_at=p_first_due_at and recurrence=p_recurrence and recurrence_every=p_recurrence_every and ends_on is not distinct from p_ends_on) then return task;end if;
  raise exception 'This save request was already used. Reload Tasks before making another change.';
 end if;
 -- A routine meal represents one bowl per family day. Avoid a second task for it.
 if p_kind='feeding' and exists(select 1 from public.task_occurrences where household_id=p_household and care_meal_id=p_meal and (due_at at time zone zone)::date=(p_first_due_at at time zone zone)::date) then raise exception 'This meal already has a task on that day. Open the existing task.';end if;
 insert into public.task_series(id,household_id,title,details,assigned_to,first_due_at,recurrence,recurrence_every,ends_on,created_by,updated_by,care_kind,care_meal_id)
 values(p_request,p_household,trim(p_title),'',p_assigned_to,p_first_due_at,p_recurrence,p_recurrence_every,p_ends_on,auth.uid(),auth.uid(),p_kind,p_meal) returning id into task;
 insert into public.task_occurrences(household_id,series_id,title,details,assigned_to,recurrence,recurrence_every,due_at)
 values(p_household,task,trim(p_title),'',p_assigned_to,p_recurrence,p_recurrence_every,p_first_due_at);
 perform public.generate_task_occurrences(p_household,clock_timestamp()-interval '90 days',clock_timestamp()+interval '180 days');
 return task;
end; $$;
create function public.assign_care_task_occurrence(p_occurrence uuid,p_assigned_to uuid,p_expected_version integer)
 returns void language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences;
begin
 select * into o from public.task_occurrences where id=p_occurrence;
 if o.id is null or auth.uid() is null or not private.is_member(o.household_id) then raise exception 'Family access denied' using errcode='42501';end if;
 perform 1 from public.households where id=o.household_id for update;
 perform 1 from public.household_members where household_id=o.household_id and user_id=auth.uid() for key share;
 if not found then raise exception 'Family access denied' using errcode='42501';end if;
 if p_assigned_to is not null then
  perform 1 from public.household_members where household_id=o.household_id and user_id=p_assigned_to for key share;
  if not found then raise exception 'Choose a current family member';end if;
 end if;
 select * into o from public.task_occurrences where id=p_occurrence for update;
 if o.care_kind is null or o.completed_at is not null then raise exception 'This task cannot be reassigned';end if;
 if p_expected_version is null or p_expected_version<>o.assignment_version then raise exception 'Responsibility changed. Reload Tasks and try again.';end if;
 if p_assigned_to is not null and not exists(select 1 from public.household_members where household_id=o.household_id and user_id=p_assigned_to) then raise exception 'Choose a current family member';end if;
 update public.task_occurrences set assigned_to=p_assigned_to where id=o.id;
end; $$;

create function public.record_task_meal(p_occurrence uuid,p_id uuid,p_items jsonb,p_at timestamptz,p_outcome text default 'given',p_notes text default '')
 returns uuid language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences; zone text; result uuid; proof record;
begin
 select * into o from public.task_occurrences where id=p_occurrence;
 if o.id is null or auth.uid() is null or not private.is_member(o.household_id) then raise exception 'Family access denied' using errcode='42501';end if;
 if o.care_kind is distinct from 'feeding' then raise exception 'Open a feeding task';end if;
 select timezone into zone from public.households where id=o.household_id;
 if p_at is null or not isfinite(p_at) or (p_at at time zone zone)::date<>(o.due_at at time zone zone)::date then raise exception 'Use Change details to record the actual time on the scheduled family day. If the meal was missed, leave this task pending and record today in Feeding.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(o.household_id::text||':'||o.care_meal_id::text||':'||(p_at at time zone zone)::date::text,0));
 perform 1 from public.households where id=o.household_id for update;
 perform 1 from public.household_members where household_id=o.household_id and user_id=auth.uid() for key share;
 if not found then raise exception 'Family access denied' using errcode='42501';end if;
 select * into o from public.task_occurrences where id=p_occurrence for update;
 if o.completed_at is not null then return o.meal_event_id;end if;
 if p_outcome='skipped' then raise exception 'No food served: this task stays pending. Record a skipped meal separately in Feeding if needed.';end if;
 -- Reuse a real, already-confirmed bowl rather than silently feeding twice.
 select e.id into result from public.feeding_meal_events e where e.household_id=o.household_id and e.routine_meal_id=o.care_meal_id
 and e.deleted_at is null and (e.occurred_at at time zone zone)::date=(p_at at time zone zone)::date order by e.occurred_at limit 1;
 if result is not null then
  if exists(select 1 from public.task_occurrences where meal_event_id=result and id<>o.id) then raise exception 'This meal is already linked to another task. Check Tasks and Feeding.';end if;
  if not exists(select 1 from public.feeding_meal_events e where e.id=result and e.outcome<>'skipped' and exists(select 1 from public.feeding_entries i where i.event_id=e.id and i.deleted_at is null and i.quantity_grams>0)) then raise exception 'The existing meal was skipped or removed. Correct it in Feeding first; the task stays pending.';end if;
 else
  if exists(select 1 from public.feeding_meal_events where id=p_id) then raise exception 'Use a new meal confirmation';end if;
  result:=public.save_meal_result(o.household_id,p_id,p_items,p_at,'app',false,o.care_meal_id,p_outcome,p_notes,false);
 end if;
 o.meal_event_id:=result;
 select * into proof from private.care_completion(o);
 if proof.done_at is null then raise exception 'Meal not confirmed. The task is still pending.';end if;
 update public.task_occurrences set meal_event_id=result,completed_at=proof.done_at,completed_by=proof.done_by where id=o.id;
 return result;
end; $$;
create function public.start_task_walk(p_occurrence uuid,p_dog uuid,p_mode text,p_track_gps boolean)
 returns public.walks language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences; w public.walks; zone text;
begin
 select * into o from public.task_occurrences where id=p_occurrence;
 if o.id is null or auth.uid() is null or not private.is_member(o.household_id) then raise exception 'Family access denied' using errcode='42501';end if;
 perform 1 from public.households where id=o.household_id for update;
 perform 1 from public.household_members where household_id=o.household_id and user_id=auth.uid() for key share;
 if not found then raise exception 'Family access denied' using errcode='42501';end if;
 select * into o from public.task_occurrences where id=p_occurrence for update;
 if o.care_kind is distinct from 'walk' or not exists(select 1 from public.dogs where id=p_dog and household_id=o.household_id) then raise exception 'Choose this family’s walking task';end if;
 select timezone into zone from public.households where id=o.household_id;
 if (o.due_at at time zone zone)::date>(clock_timestamp() at time zone zone)::date then raise exception 'This walk is scheduled for a future day';end if;
 if o.walk_id is not null then
  select * into w from public.walks where id=o.walk_id;
  if w.deleted_at is null and w.ended_at is not null then raise exception 'This task already has a saved walk. Reload Tasks.';end if;
  if w.deleted_at is null and w.walker_id=auth.uid() then return w;end if;
  if w.deleted_at is null then raise exception 'Another member is walking. Wait for their saved walk.';end if;
 end if;
 if exists(select 1 from public.walks where household_id=o.household_id and deleted_at is null and ended_at is null) then raise exception 'Finish the current walk before starting this task. The task remains pending.';end if;
 w:=public.start_walk_with_options(p_dog,p_mode,p_track_gps);
 update public.task_occurrences set walk_id=w.id where id=o.id;
 return w;
end; $$;
create or replace function public.assign_household_task_occurrence(
 p_occurrence uuid,p_assigned_to uuid,p_expected_assignee uuid
) returns void language plpgsql security definer set search_path='' as $$
declare occurrence public.task_occurrences;
begin
 select * into occurrence from public.task_occurrences where id=p_occurrence for update;
 if occurrence.id is null or auth.uid() is null or not private.is_member(occurrence.household_id) then
  raise exception 'Family access denied' using errcode='42501';
 end if;
 if occurrence.care_kind is not null then raise exception 'Reload Tasks to change responsibility for this care occurrence';end if;
 if occurrence.completed_at is not null then raise exception 'Completed task history cannot be reassigned'; end if;
 if p_assigned_to is not null and not exists(select 1 from public.household_members where household_id=occurrence.household_id and user_id=p_assigned_to) then
  raise exception 'Choose a current family member';
 end if;
 if occurrence.assigned_to is not distinct from p_assigned_to then return; end if;
 if occurrence.assigned_to is distinct from p_expected_assignee then raise exception 'Responsibility changed. Reload tasks before assigning this date.'; end if;
 update public.task_occurrences set assigned_to=p_assigned_to where id=p_occurrence;
 -- Preserve sent/claimed delivery identity; only invalidate pending work.
 update public.scheduled_notifications set status='cancelled'
 where household_id=occurrence.household_id and category='task' and source_id='task:'||p_occurrence::text and status in ('pending','sending');
 perform private.queue_task_occurrence(p_occurrence);
end; $$;
revoke all on function public.assign_household_task_occurrence(uuid,uuid,uuid) from public,anon;
grant execute on function public.assign_household_task_occurrence(uuid,uuid,uuid) to authenticated;

create or replace function private.queue_task_occurrence(p_occurrence uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences; s public.task_series; m record; v_source text;
begin
 select * into o from public.task_occurrences where id=p_occurrence;
 if o.id is null or o.care_kind is not null then return; end if;
 select * into s from public.task_series where id=o.series_id;
 if s.id is null or s.archived_at is not null or o.completed_at is not null or o.due_at<=clock_timestamp() then return; end if;
 v_source:='task:'||o.id::text;
 if o.assigned_to is not null then
  if coalesce((select enabled from public.notification_preferences where user_id=o.assigned_to and category='task'),true) then
   insert into public.scheduled_notifications(household_id,recipient_id,category,source_id,delivery_kind,title,body,route,send_at)
   values(o.household_id,o.assigned_to,'task',v_source,'reminder','Task due soon',o.title,'/tasks?occurrence='||o.id::text,greatest(o.due_at-interval '1 hour',clock_timestamp()))
   on conflict(recipient_id,source_id,delivery_kind) do update set title=excluded.title,body=excluded.body,route=excluded.route,send_at=excluded.send_at,status='pending',attempts=0,claimed_at=null,last_error=''
    where public.scheduled_notifications.sent_at is null
     and public.scheduled_notifications.claimed_at is null
     and public.scheduled_notifications.status in ('pending','cancelled','failed');
  end if;
  for m in select user_id from public.household_members where household_id=o.household_id and user_id<>o.assigned_to loop
   if coalesce((select enabled from public.notification_preferences where user_id=m.user_id and category='task'),true) then
    insert into public.scheduled_notifications(household_id,recipient_id,category,source_id,delivery_kind,title,body,route,send_at)
    values(o.household_id,m.user_id,'task',v_source,'overdue_escalation','Task is overdue',o.title,'/tasks?occurrence='||o.id::text,greatest(o.due_at+interval '1 hour',clock_timestamp()))
    on conflict(recipient_id,source_id,delivery_kind) do update set title=excluded.title,body=excluded.body,route=excluded.route,send_at=excluded.send_at,status='pending',attempts=0,claimed_at=null,last_error=''
    where public.scheduled_notifications.sent_at is null
     and public.scheduled_notifications.claimed_at is null
     and public.scheduled_notifications.status in ('pending','cancelled','failed');
   end if;
  end loop;
 else
  for m in select user_id from public.household_members where household_id=o.household_id loop
   if coalesce((select enabled from public.notification_preferences where user_id=m.user_id and category='task'),true) then
    insert into public.scheduled_notifications(household_id,recipient_id,category,source_id,delivery_kind,title,body,route,send_at)
    values(o.household_id,m.user_id,'task',v_source,'reminder','Task due soon',o.title,'/tasks?occurrence='||o.id::text,greatest(o.due_at-interval '1 hour',clock_timestamp()))
    on conflict(recipient_id,source_id,delivery_kind) do update set title=excluded.title,body=excluded.body,route=excluded.route,send_at=excluded.send_at,status='pending',attempts=0,claimed_at=null,last_error=''
    where public.scheduled_notifications.sent_at is null
     and public.scheduled_notifications.claimed_at is null
     and public.scheduled_notifications.status in ('pending','cancelled','failed');
   end if;
  end loop;
 end if;
end; $$;


create or replace function public.save_household_task(
 p_household uuid,p_id uuid,p_title text,p_details text,p_assigned_to uuid,
 p_first_due_at timestamptz,p_recurrence text,p_recurrence_every integer,p_ends_on date
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_zone text; v_local timestamp; v_archived timestamptz;
begin
 if p_id is not null and exists(select 1 from public.task_series where id=p_id and care_kind is not null) then raise exception 'Change responsibility on the occurrence; create a new task to change its schedule.';end if;
 if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied' using errcode='42501'; end if;
 if p_title is null or char_length(trim(p_title)) not between 1 and 100 or p_details is null or char_length(p_details)>1200 then raise exception 'Enter a task title (1–100 characters) and details up to 1200 characters'; end if;
 if p_first_due_at is null or not isfinite(p_first_due_at) or p_recurrence is null or p_recurrence not in ('none','daily','weekly','monthly') or p_recurrence_every is null or p_recurrence_every not between 1 and 52 then raise exception 'Invalid task schedule'; end if;
 if p_recurrence='none' and (p_recurrence_every<>1 or p_ends_on is not null) then raise exception 'One-time tasks do not have a repeat interval or end date'; end if;
 select timezone into v_zone from public.households where id=p_household;
 v_local:=p_first_due_at at time zone v_zone;
 if p_ends_on is not null and (p_recurrence='none' or p_ends_on<v_local::date) then raise exception 'Repeat end date must be on or after the first due date'; end if;
 if p_assigned_to is not null and not exists(select 1 from public.household_members where household_id=p_household and user_id=p_assigned_to) then raise exception 'Choose a current family member'; end if;
 if p_id is null then
  insert into public.task_series(household_id,title,details,assigned_to,first_due_at,recurrence,recurrence_every,ends_on,created_by,updated_by)
  values(p_household,trim(p_title),trim(p_details),p_assigned_to,p_first_due_at,p_recurrence,p_recurrence_every,p_ends_on,auth.uid(),auth.uid()) returning id into v_id;
 else
  select id,archived_at into v_id,v_archived from public.task_series where id=p_id and household_id=p_household for update;
  if v_id is null then raise exception 'Task not found'; end if;
  if v_archived is not null then raise exception 'Task is stopped. Create a new task to start again.'; end if;
  update public.task_series set title=trim(p_title),details=trim(p_details),assigned_to=p_assigned_to,first_due_at=p_first_due_at,recurrence=p_recurrence,recurrence_every=p_recurrence_every,ends_on=p_ends_on,updated_by=auth.uid(),updated_at=clock_timestamp() where id=v_id;
  -- Preserve history; reschedule only future, still-open occurrences.
  delete from public.task_occurrences where series_id=v_id and due_at>=clock_timestamp() and completed_at is null;
 end if;
 -- Persist the explicitly chosen first date even outside the rolling horizon.
 -- Preserve an existing completion at the same instant when a series is edited.
 insert into public.task_occurrences(household_id,series_id,title,details,assigned_to,recurrence,recurrence_every,due_at)
 values(p_household,v_id,trim(p_title),trim(p_details),p_assigned_to,p_recurrence,p_recurrence_every,p_first_due_at)
 on conflict(series_id,due_at) do nothing;
 -- Materialize the current planning horizon immediately so server-side reminders
 -- exist even when no one has the task screen open.
 perform public.generate_task_occurrences(p_household,clock_timestamp()-interval '90 days',clock_timestamp()+interval '180 days');
 return v_id;
end; $$;



create or replace function public.archive_household_task(p_household uuid,p_task uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied' using errcode='42501'; end if;
 update public.task_series set archived_at=clock_timestamp(),updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_task and household_id=p_household and archived_at is null;
 if not found then raise exception 'Task not found'; end if;
 -- Keep completed and overdue history, remove only future open occurrences.
 -- Existing delete triggers cancel their pending notifications.
 delete from public.task_occurrences where series_id=p_task and household_id=p_household
  and due_at>clock_timestamp() and completed_at is null and walk_id is null and meal_event_id is null;
end; $$;


-- Only the versioned occurrence RPC can change care responsibility. Legacy series
-- editing remains available for older generic tasks, not care occurrences.
create function private.guard_care_series() returns trigger language plpgsql set search_path='' as $$
begin
 if old.care_kind is not null and (new.title,new.details,new.first_due_at,new.recurrence,new.recurrence_every,new.ends_on,new.care_kind,new.care_meal_id) is distinct from (old.title,old.details,old.first_due_at,old.recurrence,old.recurrence_every,old.ends_on,old.care_kind,old.care_meal_id) then raise exception 'Create a new care task to change its schedule. Change responsibility on one occurrence.';end if;
 return new;
end; $$;
create trigger guard_care_series before update on public.task_series for each row execute function private.guard_care_series();
revoke all on function private.care_completion(public.task_occurrences),private.guard_care_occurrence(),private.refresh_care_source(),private.guard_care_series(),private.reconcile_care_meal(uuid),private.link_existing_care_meal() from public,anon,authenticated;
revoke all on function public.save_care_task(uuid,text,text,uuid,uuid,timestamptz,text,integer,date,uuid),public.assign_care_task_occurrence(uuid,uuid,integer),public.record_task_meal(uuid,uuid,jsonb,timestamptz,text,text),public.start_task_walk(uuid,uuid,text,boolean) from public,anon;
grant execute on function public.save_care_task(uuid,text,text,uuid,uuid,timestamptz,text,integer,date,uuid),public.assign_care_task_occurrence(uuid,uuid,integer),public.record_task_meal(uuid,uuid,jsonb,timestamptz,text,text),public.start_task_walk(uuid,uuid,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
