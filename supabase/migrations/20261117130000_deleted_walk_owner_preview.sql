begin;
-- Only the author may preview deleted records; family access remains completed
-- and non-deleted. Membership is still mandatory for every branch.
alter policy walk_route_read on public.walk_points using (
 exists(select 1 from public.walks w where w.id=walk_id and private.is_member(w.household_id)
 and (w.walker_id=auth.uid() or (w.deleted_at is null and w.ended_at is not null)))
);
alter policy waste_settings_read on public.walk_waste_settings using (
 exists(select 1 from public.walks w where w.id=walk_id and private.is_member(w.household_id)
 and (w.walker_id=auth.uid() or (w.deleted_at is null and w.ended_at is not null)))
);
alter policy waste_events_read on public.walk_waste_events using (
 exists(select 1 from public.walks w where w.id=walk_id and private.is_member(w.household_id)
 and (w.walker_id=auth.uid() or (w.deleted_at is null and w.ended_at is not null)))
);
commit;
