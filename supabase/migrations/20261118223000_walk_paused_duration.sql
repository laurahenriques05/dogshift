begin;
-- Proposed by Walks: coordinate ordering with Laura and review before hosted use.
alter table public.walks add column pause_intervals jsonb not null default '[]'::jsonb;
create function public.finish_walk_with_pauses(p_walk uuid,p_ended_at timestamptz,p_reason text,p_pauses jsonb) returns public.walks
language plpgsql security definer set search_path='' as $$
declare w public.walks; pause jsonb; first_at timestamptz; last_at timestamptz; previous_at timestamptz;
begin
 select * into w from public.walks where id=p_walk for update;
 if w.id is null or w.walker_id is distinct from auth.uid() or not private.is_member(w.household_id) or w.deleted_at is not null then raise exception 'Walker access required' using errcode='42501'; end if;
 if p_pauses is null or jsonb_typeof(p_pauses)<>'array' or jsonb_array_length(p_pauses)>1000 then raise exception 'Invalid pause intervals'; end if;
 if w.ended_at is not null then
  if w.pause_intervals is distinct from p_pauses or w.ended_at is distinct from p_ended_at then raise exception 'Finished walk pause conflict'; end if;
  return w;
 end if;
 previous_at:=w.started_at;
 for pause in select value from jsonb_array_elements(p_pauses) loop
  first_at:=(pause->>'start')::timestamptz;last_at:=(pause->>'end')::timestamptz;
  if first_at is null or last_at is null or not isfinite(first_at) or not isfinite(last_at) or first_at<previous_at or last_at<first_at or last_at>p_ended_at then raise exception 'Invalid pause interval'; end if;
  if exists(select 1 from public.walk_points where walk_id=w.id and recorded_at>first_at and recorded_at<last_at) then raise exception 'Pause overlaps recorded GPS'; end if;
  previous_at:=last_at;
 end loop;
 -- Existing finish logic checks times, ownership, distance, gaps and segment breaks.
 w:=public.finish_walk(p_walk,p_ended_at,p_reason);
 update public.walks set pause_intervals=p_pauses where id=w.id returning * into w;
 return w;
end; $$;
revoke all on function public.finish_walk_with_pauses(uuid,timestamptz,text,jsonb) from public,anon;
grant execute on function public.finish_walk_with_pauses(uuid,timestamptz,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
