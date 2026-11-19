begin;
-- Contacts are shared family records, like their existing create/edit permissions.
grant delete on public.vet_contacts to authenticated;
create policy vet_contacts_delete on public.vet_contacts
for delete to authenticated using(private.is_member(household_id));
commit;
