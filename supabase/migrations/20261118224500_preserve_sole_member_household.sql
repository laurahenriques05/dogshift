begin;
-- Preserve all family records and Storage files when the last owner leaves.
create table private.inactive_households (
 household_id uuid primary key references public.households(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 left_at timestamptz not null default now()
);
revoke all on private.inactive_households from public,anon,authenticated;
create function public.leave_sole_household(p_household uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to leave a family'; end if;
 perform 1 from public.households where id=p_household and deletion_requested_by is null for update;
 if not found or not private.is_owner(p_household) then raise exception 'Owner access required'; end if;
 if (select count(*) from public.household_members where household_id=p_household)<>1 then
  raise exception 'Family membership changed. Reload and transfer ownership before leaving';
 end if;
 insert into private.inactive_households(household_id,owner_id) values(p_household,auth.uid());
 update public.invitations set revoked_at=coalesce(revoked_at,now()) where household_id=p_household;
 delete from public.household_members where household_id=p_household and user_id=auth.uid();
end;
$$;
create function public.get_inactive_households() returns table(id uuid,name text,left_at timestamptz)
language sql stable security definer set search_path='' as $$
 select h.id,h.name,i.left_at from private.inactive_households i join public.households h on h.id=i.household_id
 where i.owner_id=auth.uid() and h.deletion_requested_by is null order by i.left_at desc;
$$;
create function public.restore_inactive_household(p_household uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to restore a family'; end if;
 perform 1 from public.households where id=p_household and deletion_requested_by is null for update;
 if not found or not exists(select 1 from private.inactive_households where household_id=p_household and owner_id=auth.uid()) then
  raise exception 'Inactive family unavailable';
 end if;
 if exists(select 1 from public.household_members where household_id=p_household) then raise exception 'Family membership changed'; end if;
 -- Remove the marker inside the same transaction before the guarded membership insert.
 delete from private.inactive_households where household_id=p_household;
 insert into public.household_members(household_id,user_id,role) values(p_household,auth.uid(),'owner');
end;
$$;
create function private.guard_inactive_household_join() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.households where id=new.household_id for update;
 if exists(select 1 from private.inactive_households where household_id=new.household_id) then
  raise exception 'This family is inactive';
 end if;
 return new;
end;
$$;
revoke all on function private.guard_inactive_household_join() from public,anon,authenticated;
create trigger guard_inactive_household_join before insert or update on public.household_members
for each row execute function private.guard_inactive_household_join();
revoke all on function public.leave_sole_household(uuid),public.get_inactive_households(),public.restore_inactive_household(uuid) from public,anon;
grant execute on function public.leave_sole_household(uuid),public.get_inactive_households(),public.restore_inactive_household(uuid) to authenticated;
commit;
