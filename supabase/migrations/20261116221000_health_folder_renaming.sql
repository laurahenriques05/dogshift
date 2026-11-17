begin;
-- Only the display name is editable; identity, household and author stay immutable.
grant update(name) on public.health_document_folders to authenticated;
create policy health_folder_rename on public.health_document_folders for update to authenticated
 using(private.is_member(household_id) and (created_by=auth.uid() or private.is_owner(household_id)))
 with check(private.is_member(household_id) and (created_by=auth.uid() or private.is_owner(household_id)));
commit;
