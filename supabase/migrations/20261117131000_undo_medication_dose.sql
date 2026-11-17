begin;
create function public.undo_medication_dose(p_dose uuid,p_updated_at timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare v_dose public.medication_doses;v_home uuid;
begin
 select * into v_dose from public.medication_doses where id=p_dose for update;
 select household_id into v_home from public.medication_schedules where id=v_dose.schedule_id;
 if auth.uid() is null or v_home is null or not private.is_member(v_home) then
  raise exception 'Family access denied' using errcode='42501';
 end if;
 if v_dose.recorded_at is null or v_dose.recorded_by is distinct from auth.uid() then
  raise exception 'Only the person who recorded this dose can undo it' using errcode='42501';
 end if;
 if p_updated_at is null or v_dose.updated_at is distinct from p_updated_at then
  raise exception 'This dose has changed. Refresh and review the latest record.';
 end if;
 update public.medication_doses set status='scheduled',administered_at=null,
 recorded_by=null,recorded_at=null,notes='',updated_at=clock_timestamp() where id=p_dose;
end;
$$;
revoke all on function public.undo_medication_dose(uuid,timestamptz) from public,anon;
grant execute on function public.undo_medication_dose(uuid,timestamptz) to authenticated;
commit;
