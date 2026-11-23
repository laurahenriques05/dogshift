# Remaining Health and account work

Current source specification; owner Beni. Hosted installation/deployed functions
must be checked against actual definitions and Beni/Laura reports before rollout.
A missing ledger row does not prove manual SQL was never applied. See
health-calendar-links.md for newer source-link/modal and reported migration status.

## Scope

Health now links treatment history, veterinarian contacts, private documents and weight history. All current family members may create/edit treatments, contacts and weight records; no browser deletion of those records. Documents: all current members upload/read, uploader or current owner deletes with confirmation. Account settings open from the header family/avatar menu; display names stay in profiles and password updates use Supabase Auth. Notifications are out of scope, confirmed by Carol on 23 November. No calendar or notification subsystem is introduced.

Home has a compact live Health summary (next appointment, earliest recorded vaccine due date, overdue unlogged medication count). The placeholder Health preview is removed. The summary refreshes when mounted or retried; it is not realtime.

Weight is in kg. Editing profile weight creates a timestamped measurement; adding/editing measurements updates the profile from the newest measured_at (then creation timestamp/id as tie-breakers). Older measurements do not replace the latest weight. A profile weight cannot be cleared once history exists. Existing known weights are backfilled with an explicitly labelled baseline at migration time; no historical date is invented. No deletion of measurements. Chart spacing represents elapsed time; exact dates/values remain in the list. Shared edits are last-write-wins, without full revision history.

## Schema and privileged rollout dependencies

Reconcile actual definitions and Beni/Laura reports before applying any missing capability. The deletion foundation is in the hosted ledger as 20261115152437_deletion; do not reapply it. Source dependencies:

1. `20261111220000_health_records.sql`: treatments/contacts/weight, RLS, audits, baseline and weight sync triggers.
2. `20261111220001_health_documents.sql`: private health-documents bucket, 10 MB cap, PDF/JPEG/PNG/WebP, member reads/uploads, uploader/owner deletion. Unique `<family>/<uploader>/<uuid>--<safe-name>` paths. No overwrites. Client checks size and magic bytes; bucket enforces MIME/size. Downloads use authenticated Storage API rather than public URLs. Downloaded copies cannot be revoked.
3. `20261111220002_deletion.sql`: guarded deletion requests, frozen family writes during cleanup, null-safe ownership checks, nullable author FKs with ON DELETE SET NULL, server-only finalization functions.

The third migration changes shared Walks/Feeding author contracts for anonymization and must be reviewed with their owners. No ownership/editing permissions are widened. Null-safe RPC comparisons keep deleted authors' activities immutable to other members. TypeScript contracts and name fallbacks reflect nullable authors. No frontend administrative keys.

Do not rerun earlier applied migrations. No .env.local edits were made.

## Privileged deletion deployment

Independent 23 November hosted check returned no Edge Functions. Therefore
account/family deletion endpoints are not deployed; source/UI and database guards
do not prove working Auth/Storage cleanup. Beni owns any separately authorized,
reviewed rollout. Do not deploy them as an unrelated Walks fix.

Two Supabase Edge Functions are prepared in `supabase/functions/delete-account` and `delete-household`; the shared handler uses server-side SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. Configure `APP_ORIGIN` to the exact approved application origin (e.g. local development OR production); requests from other origins fail. Keep JWT verification enabled and independently validate the user with Auth getUser. Deploy through the team's agreed workflow after database review. No browser service key, Auth configuration or email configuration changes.

Family deletion requires sole current owner membership and typing the family name. The server freezes household data, recursively removes dog photos and health documents through Storage API, then transactionally deletes the family and cascaded care records/invitations/membership. Other users' personal accounts remain. Joining/writes are guarded during cleanup. Partial Storage failures retain the deletion request; retry the same request, with the family ID persisted per user locally. No automatic rollback of already deleted files. If the function is undeployed/misconfigured, errors are shown and nothing is reported as successfully deleted. The UI requires typing confirmation on each attempt.

Account deletion requires no remaining memberships and typing DELETE MY ACCOUNT. Owners must first transfer ownership and leave; sole members may delete their family separately. Shared history/files are retained, author FKs are anonymized, feeding audit author keys are removed, related invitations are removed, Storage ownership metadata is detached (objects retained), then Auth admin deleteUser removes the account/profile and Auth session data. Existing access JWTs may persist until expiry, so membership helpers additionally require an existing Auth user and reject deletion-pending accounts. Retry before Auth deletion succeeds if a partial failure occurs. Free-text history or file contents can contain personal information entered by users; this is not a general redaction engine. Shared files retain their original path (including a pseudonymous uploader UUID).

This follows the Supabase server-side user deletion model: https://supabase.com/docs/guides/auth/managing-user-data and https://supabase.com/docs/reference/javascript/auth-admin-deleteuser . Deletion is not a client-only operation.

## Validation and remaining verification

Embedded PostgreSQL tests cover family isolation, shared permissions, weight/profile
consistency, invalid/future measurements, private files, deletion authorization,
sole-member restrictions, frozen writes and retained/anonymized history. File
checks cover size/signatures. Auth/Storage fixtures are minimal local schemas,
not live services. Current suite evidence is in verification.md.

Before release, with disposable data only: validate both Edge Functions in Deno/Supabase, exercise successful/failed/retried Storage cleanup, Auth deletion/session expiry and retained shared records. Verify server-side environment/origin/JWT configuration; do not enable service-role access in the frontend. Test each screen at phone/desktop widths, keyboard navigation, denied access, empty/loading/errors, offline failures, family switching, profile-name propagation, Auth password policy/recent-login errors, weight historical corrections and document download/delete. Live deployment and browser interaction are not established by automated unit tests.

Health source records already project into Maria's shared calendar; see
calendar-care-routines.md and health-calendar-links.md. No duplicate calendar
store or reminder delivery is required. Notifications will not be implemented.

## Weight trend presentation

Health-style Day/Week/Month/6 Months/Year calendar periods, previous/next controls, period average, gridlines, kg scale and keyboard/touch-selectable measurements. Months, weeks (Monday first), half-years and years use household calendar boundaries; averages are arithmetic means of actual measurements, without interpolation. Empty periods show no invented data. All original measurements remain listed below. No new migration.
