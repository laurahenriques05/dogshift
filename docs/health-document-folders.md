# Health document folders

Documents opens a folder list with General for existing files, New folder for household members, and an Add document action inside each folder. Empty folders are persisted. Existing objects are not moved or renamed. General is a virtual folder, not a new stored record.

## Schema and current rollout evidence

Source metadata, renaming, default naming and folder lifecycle migrations are in
supabase/migrations. Beni reported successful manual application of folder create/
rename on 17 November and default-folder/management/permanent/content deletion
on 18 November. Do not rerun them. These reports are not independent schema audits;
manual SQL may be absent from the hosted ledger. Reconcile actual definitions
with Beni/Laura before applying new changes. See health-calendar-links.md for the
current deletion-with-contents/retry and visit-scoping behaviour.

Members organize household folders; creator/owner rename and existing uploader/
owner document deletion rules remain server-enforced. General is virtual; renaming
metadata never relocates Storage objects. Unknown metadata falls back to General.
No public URLs or service-role browser credentials are introduced.

Document objects keep `household UUID/uploader UUID/upload UUID--filename`. New folder uploads use `upload UUID--folder_<folder UUID>--filename`. The folder UUID is display metadata, not authorization; all access still derives from the household/uploader path under the existing RLS. Unknown or unavailable folder metadata falls back to General, so files remain reachable. No public URLs or admin credentials are introduced. Allowed MIME types, matching signatures and 10 MB limit remain enforced.

Folder metadata cascades with household deletion. Deleting an account nulls the folder creator while preserving the family's folder. Existing private file cleanup remains unchanged because object path depth and uploader prefixes are unchanged.

Validation: disposable PGlite test covers current-member creation, shared reads, outsider/former-member/anonymous rejection, author spoofing, invalid/duplicate names, immutable identity/audit fields, owner/creator renaming, rejected rename attempts by other members/outsiders/former members, account anonymization and household cascade. File-name tests cover legacy files and new folder assignments. Real shared Supabase and phone uploads remain to be verified after reviewed migration application.


Folder and document add/edit flows use native dialogs and retain errors until
saved or cancelled. Physical-phone uploads and hosted Storage cleanup still need
explicit acceptance tests; do not delete real documents for validation.
