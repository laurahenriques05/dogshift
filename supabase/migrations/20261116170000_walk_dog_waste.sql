begin;
create table public.walk_waste_settings (
 walk_id uuid primary key references public.walks(id) on delete cascade,
 record_mode text not null check (record_mode in ('off','during','end'))
);
create table public.walk_waste_events (
 id uuid primary key,
 walk_id uuid not null references public.walk_waste_settings(walk_id) on delete cascade,
 kind text not null check (kind in ('pee','poop')),
 recorded_at timestamptz not null default clock_timestamp()
);
create index walk_waste_events_walk on public.walk_waste_events(walk_id);
alter table public.walk_waste_settings enable row level security;
alter table public.walk_waste_events enable row level security;
revoke all on public.walk_waste_settings,public.walk_waste_events from public,anon,authenticated;
grant select on public.walk_waste_settings,public.walk_waste_events to authenticated;
create policy waste_settings_read on public.walk_waste_settings for select to authenticated using (
 exists(select 1 from public.walks w where w.id=walk_id and w.deleted_at is null
 and private.is_member(w.household_id) and (w.walker_id=auth.uid() or w.ended_at is not null))
);
create policy waste_events_read on public.walk_waste_events for select to authenticated using (
 exists(select 1 from public.walks w where w.id=walk_id and w.deleted_at is null
 and private.is_member(w.household_id) and (w.walker_id=auth.uid() or w.ended_at is not null))
);
-- Start and preference are atomic. Retrying an existing start preserves its mode.
create function public.start_walk_with_waste(p_dog uuid,p_mode text) returns public.walks
language plpgsql security definer set search_path='' as $$
declare w public.walks;
begin
 if p_mode is null or p_mode not in ('off','during','end') then raise exception 'Choose a valid waste recording mode'; end if;
 w:=public.start_walk(p_dog);
 insert into public.walk_waste_settings(walk_id,record_mode) values(w.id,p_mode) on conflict(walk_id) do nothing;
 return w;
end; $$;
-- Event IDs make retries safe, including a lost HTTP response after commit.
create function public.record_walk_waste(p_id uuid,p_walk uuid,p_kind text) returns void
language plpgsql security definer set search_path='' as $$
declare w public.walks; mode text; existing public.walk_waste_events;
begin
 select * into w from public.walks where id=p_walk for update;
 if w.id is null or w.walker_id is distinct from auth.uid() or not private.is_member(w.household_id) or w.deleted_at is not null then raise exception 'Walker access required' using errcode='42501'; end if;
 select record_mode into mode from public.walk_waste_settings where walk_id=p_walk;
 if mode is null or mode='off' then raise exception 'Dog waste recording is not enabled'; end if;
 if p_id is null or p_kind is null or p_kind not in ('pee','poop') then raise exception 'Choose pee or poop'; end if;
 select * into existing from public.walk_waste_events where id=p_id;
 if existing.id is not null then
  if existing.walk_id<>p_walk or existing.kind<>p_kind then raise exception 'Waste event ID conflict'; end if;
  return;
 end if;
 insert into public.walk_waste_events(id,walk_id,kind) values(p_id,p_walk,p_kind);
end; $$;
revoke all on function public.record_walk_waste(uuid,uuid,text) from public,anon;
grant execute on function public.record_walk_waste(uuid,uuid,text) to authenticated;
revoke all on function public.start_walk_with_waste(uuid,text) from public,anon;
grant execute on function public.start_walk_with_waste(uuid,text) to authenticated;
commit;
