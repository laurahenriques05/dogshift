begin;
-- A planned dose has a due date, but must never appear as already administered.
alter table public.vaccinations alter column given_on drop not null;
alter table public.vaccinations add constraint vaccination_has_date check(given_on is not null or next_due_on is not null);
alter table public.appointment_summaries
 add column next_visit_kind text not null default 'consultation' check(next_visit_kind in ('consultation','vaccination')),
 add column next_vaccine_name text not null default '' check(char_length(next_vaccine_name)<=120),
 add constraint summary_vaccine_name_required check(next_visit_at is null or next_visit_kind<>'vaccination' or char_length(trim(next_vaccine_name)) between 1 and 120);
grant insert(next_visit_kind,next_vaccine_name),update(next_visit_kind,next_vaccine_name) on public.appointment_summaries to authenticated;
-- Only the trigger can assign these links. Stable unique source IDs make retries idempotent.
alter table public.vaccinations add column source_summary_id uuid unique references public.appointment_summaries(appointment_id) on delete set null;
alter table public.vet_appointments add column source_summary_id uuid unique references public.appointment_summaries(appointment_id) on delete set null;
create function private.sync_summary_followup() returns trigger
language plpgsql security definer set search_path='' as $$
declare visit public.vet_appointments%rowtype; zone text;
begin
 if TG_OP='UPDATE' and new.next_visit_at is not distinct from old.next_visit_at
  and new.next_visit_kind=old.next_visit_kind and new.next_vaccine_name=old.next_vaccine_name
  and (new.next_visit_at is null
   or exists(select 1 from public.vaccinations where source_summary_id=new.appointment_id)
   or exists(select 1 from public.vet_appointments where source_summary_id=new.appointment_id)) then return new; end if;
 select * into visit from public.vet_appointments where id=new.appointment_id;
 if visit.id is null or not private.is_member(visit.household_id) then raise exception 'Family access denied'; end if;
 select timezone into zone from public.households where id=visit.household_id;
 -- Preserve completed care when a subsequent follow-up is entered.
 update public.vaccinations set source_summary_id=null where source_summary_id=new.appointment_id and given_on is not null;
 update public.vet_appointments a set source_summary_id=null where source_summary_id=new.appointment_id
  and (a.starts_at<clock_timestamp() or exists(select 1 from public.appointment_summaries s where s.appointment_id=a.id));
 if new.next_visit_at is null or new.next_visit_kind<>'vaccination' then
  delete from public.vaccinations where source_summary_id=new.appointment_id and given_on is null;
 end if;
 if new.next_visit_at is null or new.next_visit_kind<>'consultation' then
  delete from public.vet_appointments where source_summary_id=new.appointment_id;
 end if;
 if new.next_visit_at is not null then
  if new.next_visit_kind='vaccination' then
   insert into public.vaccinations(household_id,name,given_on,next_due_on,veterinarian,source_summary_id)
   values(visit.household_id,trim(new.next_vaccine_name),null,(new.next_visit_at at time zone zone)::date,visit.location,new.appointment_id)
   on conflict(source_summary_id) do update set name=excluded.name,next_due_on=excluded.next_due_on,veterinarian=excluded.veterinarian;
  else
   insert into public.vet_appointments(household_id,title,starts_at,location,appointment_type,source_summary_id)
   values(visit.household_id,left('Follow-up: '||visit.title,120),new.next_visit_at,visit.location,'consultation',new.appointment_id)
   on conflict(source_summary_id) do update set starts_at=excluded.starts_at;
  end if;
 end if;
 return new;
end;
$$;
revoke all on function private.sync_summary_followup() from public,anon,authenticated;
create trigger sync_summary_followup after insert or update of next_visit_at,next_visit_kind,next_vaccine_name on public.appointment_summaries
for each row execute function private.sync_summary_followup();
-- Uses the existing calendar's vaccinations/appointments sources; no second calendar.
notify pgrst,'reload schema';
commit;
