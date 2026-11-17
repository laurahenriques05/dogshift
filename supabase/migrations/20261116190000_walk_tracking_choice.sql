begin;
alter table public.walk_waste_settings add column track_gps boolean not null default true;
create function public.start_walk_with_options(p_dog uuid,p_mode text,p_track_gps boolean) returns public.walks
language plpgsql security definer set search_path='' as $$
declare w public.walks;
begin
 if p_mode is null or p_mode not in ('off','during','end') or p_track_gps is null then raise exception 'Choose valid walk options'; end if;
 w:=public.start_walk(p_dog);
 insert into public.walk_waste_settings(walk_id,record_mode,track_gps) values(w.id,p_mode,p_track_gps) on conflict(walk_id) do nothing;
 return w;
end; $$;
revoke all on function public.start_walk_with_options(uuid,text,boolean) from public,anon;
grant execute on function public.start_walk_with_options(uuid,text,boolean) to authenticated;
create function private.check_walk_gps_choice() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.walk_waste_settings where walk_id=new.walk_id and not track_gps) then
  raise exception 'GPS tracking is disabled for this walk';
 end if;
 return new;
end; $$;
create trigger check_walk_gps_choice before insert on public.walk_points for each row execute function private.check_walk_gps_choice();
commit;
