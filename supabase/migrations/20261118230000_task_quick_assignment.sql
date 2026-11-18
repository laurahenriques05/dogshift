begin;

-- Assignment belongs to this open date; it does not reschedule the recurring
-- series or alter completed activity. The row lock and expected assignee protect
-- two family members taking the same task concurrently.
create function public.assign_household_task_occurrence(
 p_occurrence uuid,p_assigned_to uuid,p_expected_assignee uuid
) returns void language plpgsql security definer set search_path='' as $$
declare occurrence public.task_occurrences;
begin
 select * into occurrence from public.task_occurrences where id=p_occurrence for update;
 if occurrence.id is null or auth.uid() is null or not private.is_member(occurrence.household_id) then
  raise exception 'Family access denied' using errcode='42501';
 end if;
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

-- Keep the existing reminder rules consistent with an occurrence-level assignee.
-- This neither enables notifications nor deploys a sender.
create or replace function private.queue_task_occurrence(p_occurrence uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.task_occurrences; s public.task_series; m record; v_source text;
begin
 select * into o from public.task_occurrences where id=p_occurrence;
 if o.id is null then return; end if;
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

commit;
