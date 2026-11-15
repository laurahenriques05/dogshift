begin;

-- Append-only correction: retain completed history after its author is deleted.
-- An open occurrence cannot have an author; a completed one may be anonymized.
alter table public.task_occurrences drop constraint task_occurrences_check;
alter table public.task_occurrences add constraint task_completion_shape
 check (completed_at is not null or completed_by is null);

create or replace function public.complete_household_task(p_occurrence uuid,p_completed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare v_task public.task_occurrences;
begin
 select * into v_task from public.task_occurrences where id=p_occurrence for update;
 if v_task.id is null or not private.is_member(v_task.household_id) then raise exception 'Family access denied' using errcode='42501'; end if;
 if p_completed is null then raise exception 'Choose a completion state'; end if;
 if p_completed then
  if v_task.completed_at is not null and v_task.completed_by is distinct from auth.uid() then raise exception 'Only the person who logged this completion can correct it' using errcode='42501'; end if;
  update public.task_occurrences set completed_at=coalesce(completed_at,clock_timestamp()),completed_by=auth.uid() where id=p_occurrence;
 else
  if v_task.completed_by is distinct from auth.uid() then raise exception 'Only the person who logged this completion can correct it' using errcode='42501'; end if;
  update public.task_occurrences set completed_at=null,completed_by=null where id=p_occurrence;
 end if;
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
  and due_at>clock_timestamp() and completed_at is null;
end; $$;

-- A completion correction may requeue cancelled notices, never sent/claimed ones.
create or replace function private.queue_task_occurrence(p_occurrence uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences; s public.task_series; m record; v_source text;
begin
 select * into o from public.task_occurrences where id=p_occurrence;
 if o.id is null then return; end if;
 select * into s from public.task_series where id=o.series_id;
 if s.id is null or s.archived_at is not null or o.completed_at is not null or o.due_at<=clock_timestamp() then return; end if;
 v_source:='task:'||o.id::text;
 if s.assigned_to is not null then
  if coalesce((select enabled from public.notification_preferences where user_id=s.assigned_to and category='task'),true) then
   insert into public.scheduled_notifications(household_id,recipient_id,category,source_id,delivery_kind,title,body,route,send_at)
   values(o.household_id,s.assigned_to,'task',v_source,'reminder','Task due soon',s.title,'/tasks?occurrence='||o.id::text,greatest(o.due_at-interval '1 hour',clock_timestamp()))
   on conflict(recipient_id,source_id,delivery_kind) do update set title=excluded.title,body=excluded.body,route=excluded.route,send_at=excluded.send_at,status='pending',attempts=0,claimed_at=null,last_error=''
    where public.scheduled_notifications.sent_at is null
     and public.scheduled_notifications.status in ('pending','cancelled','failed');
  end if;
  for m in select user_id from public.household_members where household_id=o.household_id and user_id<>s.assigned_to loop
   if coalesce((select enabled from public.notification_preferences where user_id=m.user_id and category='task'),true) then
    insert into public.scheduled_notifications(household_id,recipient_id,category,source_id,delivery_kind,title,body,route,send_at)
    values(o.household_id,m.user_id,'task',v_source,'overdue_escalation','Task is overdue',s.title,'/tasks?occurrence='||o.id::text,greatest(o.due_at+interval '1 hour',clock_timestamp()))
    on conflict(recipient_id,source_id,delivery_kind) do update set title=excluded.title,body=excluded.body,route=excluded.route,send_at=excluded.send_at,status='pending',attempts=0,claimed_at=null,last_error=''
    where public.scheduled_notifications.sent_at is null
     and public.scheduled_notifications.status in ('pending','cancelled','failed');
   end if;
  end loop;
 else
  for m in select user_id from public.household_members where household_id=o.household_id loop
   if coalesce((select enabled from public.notification_preferences where user_id=m.user_id and category='task'),true) then
    insert into public.scheduled_notifications(household_id,recipient_id,category,source_id,delivery_kind,title,body,route,send_at)
    values(o.household_id,m.user_id,'task',v_source,'reminder','Task due soon',s.title,'/tasks?occurrence='||o.id::text,greatest(o.due_at-interval '1 hour',clock_timestamp()))
    on conflict(recipient_id,source_id,delivery_kind) do update set title=excluded.title,body=excluded.body,route=excluded.route,send_at=excluded.send_at,status='pending',attempts=0,claimed_at=null,last_error=''
    where public.scheduled_notifications.sent_at is null
     and public.scheduled_notifications.status in ('pending','cancelled','failed');
   end if;
  end loop;
 end if;
end; $$;

-- Remove already-materialized future open dates from previously archived series.
-- Past and completed occurrences remain available to the household.
delete from public.task_occurrences o using public.task_series s
 where o.series_id=s.id and s.archived_at is not null
 and o.due_at>clock_timestamp() and o.completed_at is null;

commit;
