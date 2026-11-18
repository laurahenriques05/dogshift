begin;
-- Proposed by Walks. Coordinate migration ordering/review before hosted application.
alter table public.walk_points add column segment_start boolean not null default false;
create or replace function public.append_walk_points(p_walk uuid,p_points jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare w public.walks; p record; previous public.walk_points; existing public.walk_points; n integer:=0;
begin
 select * into w from public.walks where id=p_walk for update;
 if w.id is null or w.walker_id<>auth.uid() or not private.is_member(w.household_id) then raise exception 'Walker access required' using errcode='42501'; end if;
 if w.ended_at is not null or w.deleted_at is not null then raise exception 'Walk is no longer active'; end if;
 if p_points is null or jsonb_typeof(p_points)<>'array' then raise exception 'Expected an array of GPS points'; end if;
 if jsonb_array_length(p_points)>500 then raise exception 'Batch limit is 500 points'; end if;
 select * into previous from public.walk_points where walk_id=w.id order by seq desc limit 1;
 for p in select * from jsonb_to_recordset(p_points) as x(seq integer,recorded_at timestamptz,latitude double precision,longitude double precision,accuracy double precision,segment_start boolean) order by seq loop
  select * into existing from public.walk_points where walk_id=w.id and seq=p.seq;
  if existing.walk_id is not null then
   if existing.recorded_at is distinct from p.recorded_at or existing.latitude is distinct from p.latitude or existing.longitude is distinct from p.longitude or existing.accuracy is distinct from p.accuracy or existing.segment_start is distinct from coalesce(p.segment_start,false) then raise exception 'GPS sequence conflict; resume on the original device'; end if;
   continue;
  end if;
  if p.seq is null or p.seq<>coalesce(previous.seq+1,0) or p.recorded_at is null or p.recorded_at<w.started_at or p.recorded_at>clock_timestamp()+interval '30 seconds' or (previous.recorded_at is not null and p.recorded_at<=previous.recorded_at) then raise exception 'Invalid GPS sequence or timestamp'; end if;
  insert into public.walk_points(walk_id,seq,recorded_at,latitude,longitude,accuracy,segment_start) values(w.id,p.seq,p.recorded_at,p.latitude,p.longitude,p.accuracy,coalesce(p.segment_start,false)) returning * into previous;
  n:=n+1;
 end loop;
 return n;
end; $$;
create or replace function public.finish_walk(p_walk uuid,p_ended_at timestamptz,p_reason text default 'manual') returns public.walks
language plpgsql security definer set search_path='' as $$
declare w public.walks; v_meters double precision; latest timestamptz;
begin
 select * into w from public.walks where id=p_walk for update;
 if w.id is null or w.walker_id<>auth.uid() or not private.is_member(w.household_id) then raise exception 'Walker access required' using errcode='42501'; end if;
 if w.deleted_at is not null then raise exception 'Walk has been deleted'; end if;
 if w.ended_at is not null then return w; end if;
 select max(recorded_at) into latest from public.walk_points where walk_id=w.id;
 if p_ended_at is null or p_ended_at<w.started_at or p_ended_at>clock_timestamp()+interval '30 seconds' or p_ended_at<latest or p_reason not in ('manual','stationary') or p_reason is null then raise exception 'Invalid end time or reason'; end if;
 -- Never bridge GPS interruptions (>60s) or impossible walking jumps (>5 m/s).
 with route as (
 select *,lag(latitude) over(order by seq) lat0,lag(longitude) over(order by seq) lon0,lag(recorded_at) over(order by seq) time0,lag(accuracy) over(order by seq) accuracy0 from public.walk_points where walk_id=w.id
 ), segments as (
 select segment_start,extract(epoch from recorded_at-time0) seconds,greatest(3,(accuracy+accuracy0)/2) noise_m,
  12742000 * asin(sqrt(least(1.0,power(sin(radians(latitude-lat0)/2),2)+cos(radians(lat0))*cos(radians(latitude))*power(sin(radians(longitude-lon0)/2),2)))) meters from route
 ) select coalesce(sum(case when not segment_start and seconds>0 and seconds<=60 and meters>noise_m and meters/seconds<=5 then meters else 0 end),0) into v_meters from segments;
 update public.walks set ended_at=p_ended_at,distance_m=v_meters,end_reason=p_reason where id=w.id returning * into w;
 return w;
end; $$;
create function public.set_walk_note(p_walk uuid,p_note text,p_expected text) returns public.walks
language plpgsql security definer set search_path='' as $$
declare w public.walks;
begin
 select * into w from public.walks where id=p_walk for update;
 if w.id is null or w.walker_id is distinct from auth.uid() or not private.is_member(w.household_id) or w.deleted_at is not null then raise exception 'Walker access required' using errcode='42501'; end if;
 if p_note is null or p_expected is null or char_length(p_note)>2000 then raise exception 'A note must be at most 2000 characters'; end if;
 if w.notes=trim(p_note) then return w; end if;
 if w.notes is distinct from p_expected then raise exception 'The note changed on another device. Reload before replacing it.' using errcode='40001'; end if;
 update public.walks set notes=trim(p_note) where id=w.id returning * into w;
 return w;
end; $$;
revoke all on function public.set_walk_note(uuid,text,text) from public,anon;
grant execute on function public.set_walk_note(uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
