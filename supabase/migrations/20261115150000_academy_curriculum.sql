-- Add the progressive dog-trick path. Keep stable IDs: practice and household
-- progress rows refer to them. Apply once after review; do not edit old migrations.
begin;

insert into public.academy_modules(id, course_id, position) values
  ('marker-and-reward', 'trick-training', 1),
  ('nose-target', 'trick-training', 2),
  ('sit', 'trick-training', 3),
  ('give-paw', 'trick-training', 4),
  ('lie-down', 'trick-training', 5),
  ('spin', 'trick-training', 6),
  ('high-five', 'trick-training', 7),
  ('stay', 'trick-training', 8),
  ('roll-over', 'trick-training', 9),
  ('figure-eight', 'trick-training', 10),
  ('tidy-up-toys', 'trick-training', 11);

-- Complex tricks can be practised in smaller shared steps. These are learning
-- milestones, not challenge completions: only the final module milestone awards XP.
create table public.academy_subchallenges (
  module_id text not null references public.academy_modules(id) on delete cascade,
  id text not null,
  position integer not null check(position between 1 and 20),
  title text not null check(char_length(trim(title)) between 1 and 100),
  primary key(module_id,id),
  unique(module_id,position)
);
alter table public.academy_subchallenges enable row level security;
grant select on public.academy_subchallenges to authenticated;
create policy academy_subchallenges_read on public.academy_subchallenges for select to authenticated using (
  exists(select 1 from public.academy_modules m where m.id=module_id)
);

insert into public.academy_subchallenges(module_id,id,position,title) values
 ('stay','short-stay',1,'A one-second pause'),('stay','one-step-away',2,'You take one step'),('stay','mild-distraction',3,'Stay with a small distraction'),
 ('roll-over','comfortable-side',1,'Comfortable on one side'),('roll-over','follow-shoulder',2,'Follow toward the shoulder'),('roll-over','complete-roll',3,'Join the roll'),
 ('figure-eight','left-loop',1,'First wide loop'),('figure-eight','right-loop',2,'The other direction'),('figure-eight','join-loops',3,'Connect both loops'),
 ('tidy-up-toys','pick-up',1,'Pick up a safe toy'),('tidy-up-toys','carry-to-basket',2,'Carry it to the basket'),('tidy-up-toys','drop-in-basket',3,'Drop it in');

create table public.academy_subchallenge_progress (
  household_id uuid not null references public.households(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  module_id text not null,
  subchallenge_id text not null,
  completed_at timestamptz not null default clock_timestamp(),
  completed_by uuid references auth.users(id) on delete set null,
  primary key(household_id,module_id,subchallenge_id),
  foreign key(module_id,subchallenge_id) references public.academy_subchallenges(module_id,id) on delete cascade
);
alter table public.academy_subchallenge_progress enable row level security;
grant select on public.academy_subchallenge_progress to authenticated;
create policy academy_subchallenge_progress_read on public.academy_subchallenge_progress for select to authenticated using (private.is_member(household_id));
create trigger guard_deletion before insert or update or delete on public.academy_subchallenge_progress for each row execute function private.guard_deletion();
revoke insert,update,delete on public.academy_subchallenge_progress from anon,authenticated;

create function public.complete_academy_subchallenge(
  p_household uuid,p_dog uuid,p_module text,p_subchallenge text,p_id uuid
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_title text; v_rows integer;
begin
  if auth.uid() is null or not private.is_member(p_household) then raise exception 'Family access denied'; end if;
  if not exists(select 1 from public.dogs where id=p_dog and household_id=p_household) then raise exception 'Dog not found in this family'; end if;
  select s.title into v_title from public.academy_subchallenges s where s.module_id=p_module and s.id=p_subchallenge;
  if v_title is null then raise exception 'Challenge part not found'; end if;
  if exists(select 1 from public.academy_modules current_module join public.academy_modules previous_module
      on previous_module.course_id=current_module.course_id and previous_module.position=current_module.position-1
      where current_module.id=p_module and not exists(select 1 from public.academy_module_progress done
        where done.household_id=p_household and done.dog_id=p_dog and done.module_id=previous_module.id)) then
    raise exception 'Complete the previous challenge first';
  end if;
  if exists(select 1 from public.academy_module_progress where household_id=p_household and dog_id=p_dog and module_id=p_module) then
    raise exception 'Challenge already complete';
  end if;
  if exists(select 1 from public.academy_subchallenges s where s.module_id=p_module and s.position < (select current_part.position from public.academy_subchallenges current_part where current_part.module_id=p_module and current_part.id=p_subchallenge)
    and not exists(select 1 from public.academy_subchallenge_progress p where p.household_id=p_household and p.dog_id=p_dog and p.module_id=s.module_id and p.subchallenge_id=s.id)) then
    raise exception 'Complete the previous part first';
  end if;
  insert into public.academy_subchallenge_progress(household_id,dog_id,module_id,subchallenge_id,completed_by)
    values(p_household,p_dog,p_module,p_subchallenge,auth.uid()) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows=0 then return false; end if;
  insert into public.academy_practice(id,household_id,dog_id,module_id,user_id,checklist,performance,completed)
    values(p_id,p_household,p_dog,p_module,auth.uid(),jsonb_build_object('subchallenge_id',p_subchallenge,'subchallenge_complete',true),'Completed part: '||v_title,false);
  return true;
end;
$$;
revoke all on function public.complete_academy_subchallenge(uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.complete_academy_subchallenge(uuid,uuid,text,text,uuid) to authenticated;

create function private.require_academy_subchallenges_before_completion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.academy_subchallenges s where s.module_id=new.module_id)
    and exists(select 1 from public.academy_subchallenges s where s.module_id=new.module_id and not exists(
      select 1 from public.academy_subchallenge_progress p where p.household_id=new.household_id and p.dog_id=new.dog_id and p.module_id=s.module_id and p.subchallenge_id=s.id
    )) then raise exception 'Complete each challenge part first'; end if;
  return new;
end;
$$;
create trigger academy_subchallenges_before_module_completion before insert on public.academy_module_progress
  for each row execute function private.require_academy_subchallenges_before_completion();

commit;
