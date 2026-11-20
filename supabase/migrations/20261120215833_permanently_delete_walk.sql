-- Only the author/current member can permanently remove an already deleted,
-- completed walk. Existing FK cascades remove GPS/waste/notes; task links use
-- ON DELETE SET NULL and their existing completion guards remain in force.
begin;
create function public.permanently_delete_walk(p_walk uuid) returns void
language plpgsql security definer set search_path='' as $$
declare w public.walks;
begin
 select * into w from public.walks where id=p_walk for update;
 if auth.uid() is null or w.id is null or w.walker_id is distinct from auth.uid()
    or not private.is_member(w.household_id) then
  raise exception 'Walker access required' using errcode='42501';
 end if;
 if w.ended_at is null or w.deleted_at is null then
  raise exception 'Only completed, deleted walks can be permanently removed' using errcode='22023';
 end if;
 delete from public.walks where id=w.id;
end; $$;
revoke all on function public.permanently_delete_walk(uuid) from public,anon;
grant execute on function public.permanently_delete_walk(uuid) to authenticated;
commit;
