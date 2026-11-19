begin;
-- Proposal: review with Laura before hosted application. Depends on journal/daily-plan, dog waste, pause/notes and paused-duration.
alter table public.walks add column timeline_edits jsonb not null default '[]';
alter table public.walks add column edit_revision integer not null default 0;
create function private.bump_walk_edit_revision() returns trigger language plpgsql set search_path='' as $$
begin new.edit_revision:=old.edit_revision+1;return new;end;$$;
create trigger walk_edit_revision before update on public.walks for each row execute function private.bump_walk_edit_revision();
create table private.walk_correction_audit(id bigint generated always as identity primary key,walk_id uuid not null,actor_id uuid not null,corrected_at timestamptz not null default clock_timestamp(),before_state jsonb not null,after_state jsonb not null);
alter table private.walk_correction_audit enable row level security;
revoke all on private.walk_correction_audit from public,anon,authenticated;
create function public.correct_walk_details(p_walk uuid,p_revision integer,p_start timestamptz,p_end timestamptz,p_legacy text,p_expected_notes jsonb,p_notes jsonb,p_events jsonb) returns public.walks
language plpgsql security definer set search_path='' as $$
declare w public.walks; before_w public.walks; entry jsonb; note_id uuid; at_time timestamptz; before_notes jsonb; after_notes jsonb; before_waste jsonb; after_waste jsonb; pauses jsonb:='[]'; pause_start timestamptz; pause_end timestamptz; previous_pause timestamptz; i integer;
begin
 select * into w from public.walks where id=p_walk for update;
 if auth.uid() is null or w.id is null or w.walker_id is distinct from auth.uid() or not private.is_member(w.household_id) or w.deleted_at is not null or w.ended_at is null then raise exception 'Completed walk author access required' using errcode='42501';end if;
 if p_revision is distinct from w.edit_revision then raise exception 'Walk changed. Cancel and reload before editing.' using errcode='40001';end if;
 if p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end) or p_end<p_start or p_end>clock_timestamp()+interval '30 seconds' then raise exception 'Invalid walk times';end if;
 if p_expected_notes is null or jsonb_typeof(p_expected_notes)<>'array' or p_notes is null or jsonb_typeof(p_notes)<>'array' or p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>1000 then raise exception 'Invalid corrections';end if;
 select coalesce(jsonb_agg(to_jsonb(n) order by id),'[]') into before_notes from public.walk_note_entries n where walk_id=w.id;
 if jsonb_array_length(p_expected_notes)<>jsonb_array_length(before_notes) or exists(
 select 1 from jsonb_to_recordset(p_expected_notes) x(id uuid,text text,recorded_at timestamptz) full join public.walk_note_entries n on n.id=x.id and n.walk_id=w.id where (n.walk_id=w.id or x.id is not null) and (n.id is null or x.id is null or n.text is distinct from x.text or n.recorded_at is distinct from x.recorded_at)) then raise exception 'Notes changed. Cancel and reload before editing.' using errcode='40001';end if;
 if jsonb_array_length(p_notes)<>jsonb_array_length(before_notes) or (select count(distinct x->>'id') from jsonb_array_elements(p_notes) x)<>jsonb_array_length(p_notes) then raise exception 'Keep all existing note IDs';end if;
 for entry in select value from jsonb_array_elements(p_notes) loop
  note_id:=(entry->>'id')::uuid;at_time:=(entry->>'recorded_at')::timestamptz;
  if note_id is null or not exists(select 1 from public.walk_note_entries where id=note_id and walk_id=w.id) or entry->>'text' is null or char_length(trim(entry->>'text')) not between 1 and 2000 or at_time is null or not isfinite(at_time) or at_time<p_start or at_time>clock_timestamp()+interval '30 seconds' then raise exception 'Invalid note correction';end if;
 end loop;
 if (select count(distinct x->>'id') from jsonb_array_elements(p_events) x)<>jsonb_array_length(p_events) then raise exception 'Duplicate timeline event';end if;
 for entry in select value from jsonb_array_elements(p_events) loop
  at_time:=(entry->>'at')::timestamptz;
  if entry->>'id' is null or entry->>'id' !~ '^(start|finish|gps-start|(resume|gap|distance)-[0-9]+|waste-[0-9a-f-]{36}|pause-(start|end)-[0-9]+)$' or entry->>'label' is null or char_length(trim(entry->>'label')) not between 1 and 200 or at_time is null or not isfinite(at_time) or at_time<p_start or at_time>p_end then raise exception 'Invalid timeline event';end if;
  if (entry->>'id'='start' and at_time<>p_start) or (entry->>'id'='finish' and at_time<>p_end) then raise exception 'Boundary event times must match the walk';end if;
 end loop;
 -- Apply pause-time corrections to duration accounting, never to GPS fixes.
 previous_pause:=p_start;
 for i in 0..jsonb_array_length(w.pause_intervals)-1 loop
  select coalesce((select (x->>'at')::timestamptz from jsonb_array_elements(p_events) x where x->>'id'='pause-start-'||i),(w.pause_intervals->i->>'start')::timestamptz) into pause_start;
  select coalesce((select (x->>'at')::timestamptz from jsonb_array_elements(p_events) x where x->>'id'='pause-end-'||i),(w.pause_intervals->i->>'end')::timestamptz) into pause_end;
  if pause_start is null or pause_end is null or pause_start<previous_pause or pause_end<pause_start or pause_end>p_end or exists(select 1 from public.walk_points where walk_id=w.id and recorded_at>pause_start and recorded_at<pause_end) then raise exception 'Invalid pause correction or overlap with recorded GPS';end if;
  pauses:=pauses||jsonb_build_array(jsonb_build_object('start',pause_start,'end',pause_end));previous_pause:=pause_end;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') into before_waste from public.walk_waste_events e where walk_id=w.id;
 before_w:=w;
 w:=public.correct_walk(w.id,p_start,p_end,p_legacy);
 for entry in select value from jsonb_array_elements(p_notes) loop
  update public.walk_note_entries set text=trim(entry->>'text'),recorded_at=(entry->>'recorded_at')::timestamptz where id=(entry->>'id')::uuid and walk_id=w.id;
 end loop;
 for entry in select value from jsonb_array_elements(p_events) loop
  if entry->>'id' like 'waste-%' then
   update public.walk_waste_events set recorded_at=(entry->>'at')::timestamptz where walk_id=w.id and id=substring(entry->>'id' from 7)::uuid;
   if not found then raise exception 'Waste event no longer available';end if;
  end if;
 end loop;
 update public.walks set pause_intervals=pauses,timeline_edits=p_events where id=w.id returning * into w;
 select coalesce(jsonb_agg(to_jsonb(n) order by id),'[]') into after_notes from public.walk_note_entries n where walk_id=w.id;
 select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') into after_waste from public.walk_waste_events e where walk_id=w.id;
 insert into private.walk_correction_audit(walk_id,actor_id,before_state,after_state) values(w.id,auth.uid(),jsonb_build_object('walk',to_jsonb(before_w),'notes',before_notes,'waste',before_waste),jsonb_build_object('walk',to_jsonb(w),'notes',after_notes,'waste',after_waste));
 return w;
end;$$;
revoke all on function public.correct_walk_details(uuid,integer,timestamptz,timestamptz,text,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.correct_walk_details(uuid,integer,timestamptz,timestamptz,text,jsonb,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
