begin;

-- General responsibilities retain a topic independently of their source feature.
-- Existing untyped tasks remain Other; never infer a medical category from text.
alter table public.task_series add column category text not null default 'other'
 check (category in ('health','other'));
alter table public.task_occurrences add column category text not null default 'other'
 check (category in ('health','other'));

create function private.task_occurrence_category() returns trigger
language plpgsql set search_path='' as $$
begin
 select category into new.category from public.task_series where id=new.series_id;
 return new;
end; $$;
revoke all on function private.task_occurrence_category() from public,anon,authenticated;
create trigger task_occurrence_category before insert on public.task_occurrences
 for each row execute function private.task_occurrence_category();

-- A new name preserves old clients and the existing nine-argument RPC contract.
-- Saving details and topic is atomic: any failure rolls back the entire call.
create function public.save_categorized_household_task(
 p_household uuid,p_id uuid,p_title text,p_details text,p_assigned_to uuid,
 p_first_due_at timestamptz,p_recurrence text,p_recurrence_every integer,p_ends_on date,
 p_category text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not private.is_member(p_household) then
  raise exception 'Family access denied' using errcode='42501';
 end if;
 if p_category is null or p_category not in ('health','other') then
  raise exception 'Choose Health or Other for a general task';
 end if;
 v_id:=public.save_household_task(p_household,p_id,p_title,p_details,p_assigned_to,
  p_first_due_at,p_recurrence,p_recurrence_every,p_ends_on);
 update public.task_series set category=p_category where id=v_id and household_id=p_household;
 -- Completed occurrences keep their original topic, title and attribution.
 update public.task_occurrences set category=p_category
 where series_id=v_id and household_id=p_household and completed_at is null;
 return v_id;
end; $$;
revoke all on function public.save_categorized_household_task(uuid,uuid,text,text,uuid,timestamptz,text,integer,date,text) from public,anon;
grant execute on function public.save_categorized_household_task(uuid,uuid,text,text,uuid,timestamptz,text,integer,date,text) to authenticated;

commit;
