# Health document folders

Documents opens a folder list with General for existing files, New folder for household members, and an Add document action inside each folder. Empty folders are persisted. Existing objects are not moved or renamed. General is a virtual folder, not a new stored record.

## Release dependency

Review `supabase/migrations/20261116220000_health_document_folders.sql` with Laura before applying it once to the shared project. This change has not been applied by the agent. It requires the existing households, auth users, and private.is_member foundation. It adds only folder metadata and RLS; it does not change existing Storage policies or buckets. If metadata is unavailable, show an error, disable folder creation, and keep existing documents accessible through General. Do not reset the shared database or rerun old migrations.

Current members can create and view folders. Folder names are limited to 80 characters and unique within each household ignoring case. Folder deletion and document moving are not included. Apply the follow-up `20261116221000_health_folder_renaming.sql` after the folder metadata migration to enable renaming by the creator or current household owner. Only UPDATE(name) is granted; household, ID, author and creation time are immutable. Folder names change without moving or renaming any Storage object. General is a virtual default folder and has no Rename action. Document upload/download/delete permissions remain the existing private Storage rules: current household membership is required; only the uploader or household owner may delete a file. The UI reserves General as the default folder name.

Document objects keep `household UUID/uploader UUID/upload UUID--filename`. New folder uploads use `upload UUID--folder_<folder UUID>--filename`. The folder UUID is display metadata, not authorization; all access still derives from the household/uploader path under the existing RLS. Unknown or unavailable folder metadata falls back to General, so files remain reachable. No public URLs or admin credentials are introduced. Allowed MIME types, matching signatures and 10 MB limit remain enforced.

Folder metadata cascades with household deletion. Deleting an account nulls the folder creator while preserving the family's folder. Existing private file cleanup remains unchanged because object path depth and uploader prefixes are unchanged.

Validation: disposable PGlite test covers current-member creation, shared reads, outsider/former-member/anonymous rejection, author spoofing, invalid/duplicate names, immutable identity/audit fields, owner/creator renaming, rejected rename attempts by other members/outsiders/former members, account anonymization and household cascade. File-name tests cover legacy files and new folder assignments. Real shared Supabase and phone uploads remain to be verified after reviewed migration application.
