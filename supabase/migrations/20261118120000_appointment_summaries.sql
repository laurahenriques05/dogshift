begin;
alter table public.vet_appointments add column appointment_type text not null default 'uncategorised' check(appointment_type in ('uncategorised','consultation','vaccination','examination','surgery','other'));
grant insert(appointment_type), update(appointment_type) on public.vet_appointments to authenticated;
-- Shared care information; existing appointment audit/RLS rules remain unchanged.
create table public.appointment_summaries (
 appointment_id uuid primary key references public.vet_appointments(id) on delete cascade,
 reason text not null default '' check(char_length(reason)<=2000),
 observations text not null default '' check(char_length(observations)<=4000),
 treatment text not null default '' check(char_length(treatment)<=4000),
 next_visit_at timestamptz check(next_visit_at is null or isfinite(next_visit_at)),
 medication_ids uuid[] not null default '{}' check(cardinality(medication_ids)<=20),
 document_paths text[] not null default '{}' check(cardinality(document_paths)<=20),
 updated_by uuid default auth.uid() references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
create function private.appointment_summary_member(visit uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vet_appointments a where a.id=visit and private.is_member(a.household_id));
$$;
revoke all on function private.appointment_summary_member(uuid) from public;
grant execute on function private.appointment_summary_member(uuid) to authenticated;
create function private.validate_appointment_summary() returns trigger
language plpgsql security definer set search_path='' as $$
declare home uuid;
begin
 -- Permit only the FK-driven anonymisation when an Auth account is deleted.
 if TG_OP='UPDATE' and pg_trigger_depth()>1 and new.updated_by is null and old.updated_by is not null
  and (to_jsonb(new)-'updated_by')=(to_jsonb(old)-'updated_by') then return new; end if;
 if TG_OP='UPDATE' and new.appointment_id<>old.appointment_id then raise exception 'Appointment cannot be changed'; end if;
 select household_id into home from public.vet_appointments where id=new.appointment_id;
 if home is null or not private.is_member(home) then raise exception 'Family access denied'; end if;
 if exists(select 1 from unnest(new.medication_ids) m(id) where m.id is null or not exists(select 1 from public.medication_schedules s where s.id=m.id and s.household_id=home)) then
  raise exception 'Choose medication from this family';
 end if;
 if exists(select 1 from unnest(new.document_paths) d(path) where d.path is null or not exists(select 1 from storage.objects o where o.bucket_id='health-documents' and o.name=d.path and split_part(o.name,'/',1)=home::text)) then
  raise exception 'Choose documents from this family';
 end if;
 new.updated_by:=auth.uid(); new.updated_at:=clock_timestamp();
 return new;
end;
$$;
revoke all on function private.validate_appointment_summary() from public;
create trigger validate_appointment_summary before insert or update on public.appointment_summaries for each row execute function private.validate_appointment_summary();
alter table public.appointment_summaries enable row level security;
revoke all on public.appointment_summaries from anon,authenticated;
grant select on public.appointment_summaries to authenticated;
grant insert(appointment_id,reason,observations,treatment,next_visit_at,medication_ids,document_paths) on public.appointment_summaries to authenticated;
grant update(appointment_id,reason,observations,treatment,next_visit_at,medication_ids,document_paths) on public.appointment_summaries to authenticated;
create policy summary_read on public.appointment_summaries for select to authenticated using(private.appointment_summary_member(appointment_id));
create policy summary_create on public.appointment_summaries for insert to authenticated with check(private.appointment_summary_member(appointment_id));
create policy summary_edit on public.appointment_summaries for update to authenticated using(private.appointment_summary_member(appointment_id)) with check(private.appointment_summary_member(appointment_id));
commit;
