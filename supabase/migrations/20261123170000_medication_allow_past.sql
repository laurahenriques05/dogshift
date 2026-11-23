begin;
create or replace function public.log_medication_dose(p_dose uuid,p_status text,p_actual timestamptz,p_notes text) returns void
language plpgsql security definer set search_path='' as $$
declare v_dose public.medication_doses; v_home uuid; v_zone text;
begin
 select * into v_dose from public.medication_doses where id=p_dose for update;
 select household_id into v_home from public.medication_schedules where id=v_dose.schedule_id;
 if v_home is null or not private.is_member(v_home) then raise exception 'Family access denied' using errcode='42501'; end if;
 if v_dose.recorded_at is not null and v_dose.recorded_by is distinct from auth.uid() then raise exception 'This dose was already logged by another member'; end if;
 if p_status is null or p_status not in ('given','skipped') then raise exception 'Choose given or skipped'; end if;
 select timezone into v_zone from public.households where id=v_home;
 if p_status='given' and (
   (v_dose.scheduled_at at time zone v_zone)::date > (clock_timestamp() at time zone v_zone)::date
 ) then raise exception 'Future doses cannot be marked as given. You can record today’s and previous days’ doses.'; end if;
 if p_status='given' and (p_actual is null or not isfinite(p_actual) or p_actual>clock_timestamp()) then raise exception 'Actual administration time must not be in the future'; end if;
 update public.medication_doses set status=p_status,administered_at=case when p_status='given' then p_actual else null end,
 recorded_by=auth.uid(),recorded_at=coalesce(recorded_at,clock_timestamp()),updated_at=clock_timestamp(),notes=coalesce(p_notes,'') where id=p_dose;
end;
$$;

notify pgrst, 'reload schema';
commit;
