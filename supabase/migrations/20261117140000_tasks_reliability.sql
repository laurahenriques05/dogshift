begin;

-- Reviewed separately: do not reapply any earlier migration.
create or replace function public.save_household_task(
 p_household uuid,p_id uuid,p_title text,p_details text,p_assigned_to uuid,
 p_first_due_at timestamptz,p_recurrence text,p_recurrence_every integer,p_ends_on date
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_zone text; v_local timestamp; v_archived timestamptz;
begin
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


-- A departed member must no longer own open shared work. Completed activity
-- authorship is deliberately preserved. This is scoped to the family they left.
create function private.release_task_assignee(p_household uuid,p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare occurrence record;
begin
 if not exists(select 1 from public.households where id=p_household and deletion_requested_by is null) then return; end if;
 update public.task_series set assigned_to=null,updated_at=clock_timestamp()
 where household_id=p_household and assigned_to=p_user;
 for occurrence in select id from public.task_occurrences
  where household_id=p_household and assigned_to=p_user and completed_at is null for update loop
  update public.task_occurrences set assigned_to=null where id=occurrence.id;
  update public.scheduled_notifications set status='cancelled'
   where household_id=p_household and category='task' and source_id='task:'||occurrence.id::text and status in ('pending','sending');
  perform private.queue_task_occurrence(occurrence.id);
 end loop;
 -- Pending escalations may also have targeted the person who just left.
 update public.scheduled_notifications set status='cancelled'
 where household_id=p_household and category='task' and recipient_id=p_user and status in ('pending','sending');
end; $$;
revoke all on function private.release_task_assignee(uuid,uuid) from public,anon,authenticated;

create function private.release_departed_task_assignee() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform private.release_task_assignee(old.household_id,old.user_id);
 return old;
end; $$;
revoke all on function private.release_departed_task_assignee() from public,anon,authenticated;
create trigger release_departed_task_assignee after delete on public.household_members
 for each row execute function private.release_departed_task_assignee();

-- Reconcile previously departed assignees; task history and sent notifications
-- remain intact. No reminders are delivered by this migration.
do $$declare departed record;
begin
 for departed in select distinct s.household_id,s.assigned_to from public.task_series s
 join public.households h on h.id=s.household_id
 where s.assigned_to is not null and h.deletion_requested_by is null
 and not exists(select 1 from public.household_members m where m.household_id=s.household_id and m.user_id=s.assigned_to) loop
  perform private.release_task_assignee(departed.household_id,departed.assigned_to);
 end loop;
end; $$;

-- Repair the first chosen date of existing active series outside the old
-- materialization horizon. Never recreate stopped series or duplicate dates.
insert into public.task_occurrences(household_id,series_id,title,details,assigned_to,recurrence,recurrence_every,due_at)
select s.household_id,s.id,s.title,s.details,s.assigned_to,s.recurrence,s.recurrence_every,s.first_due_at
from public.task_series s join public.households h on h.id=s.household_id
where s.archived_at is null and h.deletion_requested_by is null
on conflict(series_id,due_at) do nothing;

commit;
