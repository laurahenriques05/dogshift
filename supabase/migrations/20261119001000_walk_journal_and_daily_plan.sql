begin;
-- Walks proposal: coordinate schema ordering/contracts with Laura before hosted use.
create table public.walk_note_entries(
 id uuid primary key,walk_id uuid not null references public.walks(id) on delete cascade,
 author_id uuid not null references auth.users(id),text text not null check(char_length(text) between 1 and 2000),recorded_at timestamptz not null
);
create index walk_note_history_order on public.walk_note_entries(walk_id,recorded_at,id);
alter table public.walk_note_entries enable row level security;
revoke all on public.walk_note_entries from anon,authenticated;
grant select on public.walk_note_entries to authenticated;
create policy walk_notes_read on public.walk_note_entries for select to authenticated using(exists(select 1 from public.walks w where w.id=walk_id and private.is_member(w.household_id) and w.deleted_at is null and (w.walker_id=auth.uid() or w.ended_at is not null)));
create function public.append_walk_note(p_id uuid,p_walk uuid,p_text text,p_recorded_at timestamptz) returns public.walk_note_entries
language plpgsql security definer set search_path='' as $$
declare w public.walks;n public.walk_note_entries;
begin
 select * into w from public.walks where id=p_walk for update;
 if w.id is null or w.walker_id is distinct from auth.uid() or not private.is_member(w.household_id) or w.deleted_at is not null then raise exception 'Walker access required' using errcode='42501';end if;
 if p_id is null or p_text is null or char_length(trim(p_text)) not between 1 and 2000 or p_recorded_at is null or not isfinite(p_recorded_at) or p_recorded_at<w.started_at or p_recorded_at>clock_timestamp()+interval '30 seconds' then raise exception 'Invalid walk note';end if;
 select * into n from public.walk_note_entries where id=p_id;
 if n.id is not null then
  if n.walk_id<>p_walk or n.author_id<>auth.uid() or n.text<>trim(p_text) or n.recorded_at<>p_recorded_at then raise exception 'Note retry conflict';end if;return n;
 end if;
 insert into public.walk_note_entries values(p_id,p_walk,auth.uid(),trim(p_text),p_recorded_at) returning * into n;return n;
end;$$;
revoke all on function public.append_walk_note(uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.append_walk_note(uuid,uuid,text,timestamptz) to authenticated;
create table public.walk_daily_plans(dog_id uuid primary key references public.dogs(id) on delete cascade,household_id uuid not null references public.households(id) on delete cascade,required_count integer not null check(required_count between 1 and 12));
create table public.walk_daily_checks(id uuid primary key,dog_id uuid not null references public.dogs(id) on delete cascade,household_id uuid not null references public.households(id) on delete cascade,member_id uuid not null references auth.users(id),local_day date not null,slot integer not null check(slot between 1 and 12),recorded_at timestamptz not null default clock_timestamp(),deleted_at timestamptz);
create unique index walk_daily_slot on public.walk_daily_checks(dog_id,local_day,slot) where deleted_at is null;
alter table public.walk_daily_plans enable row level security;alter table public.walk_daily_checks enable row level security;
revoke all on public.walk_daily_plans,public.walk_daily_checks from anon,authenticated;grant select on public.walk_daily_plans,public.walk_daily_checks to authenticated;
create policy walk_plan_read on public.walk_daily_plans for select to authenticated using(private.is_member(household_id));
create policy walk_checks_read on public.walk_daily_checks for select to authenticated using(private.is_member(household_id));
create function public.set_walk_daily_plan(p_dog uuid,p_count integer) returns void language plpgsql security definer set search_path='' as $$
declare d public.dogs;
begin select * into d from public.dogs where id=p_dog;if d.id is null or not private.is_member(d.household_id) then raise exception 'Member access required' using errcode='42501';end if;
 if p_count is null or p_count not between 1 and 12 then raise exception 'Choose between 1 and 12 daily walks';end if;
 insert into public.walk_daily_plans values(d.id,d.household_id,p_count) on conflict(dog_id) do update set required_count=excluded.required_count;
end;$$;
create function public.record_walk_daily_check(p_id uuid,p_dog uuid,p_day date,p_slot integer) returns public.walk_daily_checks language plpgsql security definer set search_path='' as $$
declare d public.dogs;h public.households;n public.walk_daily_checks;goal integer;
begin
 select * into d from public.dogs where id=p_dog;
 if d.id is null or not private.is_member(d.household_id) then raise exception 'Member access required' using errcode='42501';end if;
 select * into h from public.households where id=d.household_id;select required_count into goal from public.walk_daily_plans where dog_id=d.id;
 if p_id is null or p_day is null or p_day<>(clock_timestamp() at time zone h.timezone)::date or goal is null or p_slot is null or p_slot<1 or p_slot>goal then raise exception 'Invalid daily walk';end if;
 perform pg_advisory_xact_lock(hashtextextended(d.id::text||p_day::text,2));
 select * into n from public.walk_daily_checks where id=p_id;
 if n.id is not null then
  if n.dog_id<>d.id or n.local_day<>p_day or n.slot<>p_slot or n.member_id<>auth.uid() then raise exception 'Daily walk retry conflict';end if;return n;
 end if;
 select * into n from public.walk_daily_checks where dog_id=d.id and local_day=p_day and slot=p_slot and deleted_at is null;if n.id is not null then return n;end if;
 insert into public.walk_daily_checks(id,dog_id,household_id,member_id,local_day,slot) values(p_id,d.id,d.household_id,auth.uid(),p_day,p_slot) returning * into n;return n;
end;$$;
create function public.undo_walk_daily_check(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare n public.walk_daily_checks;
begin select * into n from public.walk_daily_checks where id=p_id for update;if n.id is null or n.member_id is distinct from auth.uid() or not private.is_member(n.household_id) then raise exception 'Author access required' using errcode='42501';end if;
 update public.walk_daily_checks set deleted_at=coalesce(deleted_at,clock_timestamp()) where id=p_id;
end;$$;
revoke all on function public.set_walk_daily_plan(uuid,integer),public.record_walk_daily_check(uuid,uuid,date,integer),public.undo_walk_daily_check(uuid) from public,anon;
grant execute on function public.set_walk_daily_plan(uuid,integer),public.record_walk_daily_check(uuid,uuid,date,integer),public.undo_walk_daily_check(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
