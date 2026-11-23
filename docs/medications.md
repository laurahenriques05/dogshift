# Medication schedules and dose logs

Current source specification; owner Beni. Hosted installation/deployed functions
must be checked against actual definitions and Beni/Laura reports before rollout.
A missing ledger row does not prove manual SQL was never applied. See
health-calendar-links.md for newer source-link/modal and reported migration status.

Health → Medication schedules & dose logs (`/health/medications`). All current family members may create/edit shared schedules and reschedule unlogged doses, as agreed with Beni. All may read. Only the recorder may correct a given/skipped log. Schedule/dose deletion is not the same as Undo dose: the recorder-only undo RPC is reported installed; see health-calendar-links.md.

## Schema dependency and rollout verification

Source dependency: supabase/migrations/202611110003_medications.sql. Medication
capabilities exist on the hosted project; manual SQL may be absent from its ledger.
Never replay the file without reconciling definitions with Beni/Laura. No Auth,
notification or unrelated environment change is authorized.

Schedules contain the medication name and prescribed instructions entered by the family. No recommendations or dose calculations. Create one dose or up to 366 daily doses at one chosen local time. Edit a schedule to add another series (for example another prescribed daily time). There is no indefinite recurrence. Planned times are materialized as UTC instants; subsequent family timezone changes affect display, not the stored instants. DST gaps/overlaps fail the whole client submission rather than silently shifting times. The existing timezone helper is used.

Given/skipped are stored states; overdue is derived from scheduled_at for unlogged doses and refreshes in the interface every 30 seconds. Actual administration time is separate from planned time, required for given and cannot be future. Skipped has no administration timestamp. recorded_by and recorded_at are server-set, with updated_at for corrections. Initial recording time is retained on correction. Schedule audit records the latest editor; there is no full revision history. Editing prescribed instructions updates the shared schedule display; dose logs do not snapshot old prescription text.

RLS restricts reads to current members. Browser roles have no direct table writes. Scoped RPCs check membership, lock a dose row before logging, and reject another recorder even on a competing request. A unique schedule/time constraint prevents duplicate planned doses within a schedule; deliberate creation of separate schedules is not deduplicated. A recorder may correct given/skipped or explicitly Undo through the guarded undo RPC; authorship cannot be transferred. Undo resets scheduled state, not a hard delete. Shared schedule edits are last-write-wins.

## Tests and manual checks

`npm test` uses the actual migration in embedded PostgreSQL to verify member scheduling/editing, deduplication, logged dose protection, recorder corrections, outsider/anonymous/former-member denial and invalid actual times. Existing timezone tests exercise DST. Row locking and competing-recorder rejection are tested sequentially in embedded Postgres; simultaneous hosted requests still require integration testing.

After coordinated migration application, create a disposable schedule, add multiple daily times, reload, log a dose, correct your log, and test another member being blocked from changing it. Check family switching, offline save/load/retry, 375px layout, keyboard use and a device timezone different from the family. Hosted Supabase/browser interaction is not verified by the unit tests. Do not test with real medication decisions or send notifications.

## Shared calendar

The calendar projects dose source records, using stable dose IDs, household-local
display and /health/medications?dose=<UUID>. Given/Skipped remain visible. Source
changes update on reload/focus without duplicate calendar rows. Notifications are
out of scope; no reminder sync/cancel rollout is required.

## Current administration-date rule — 23 November 2026

`20261123170000_medication_allow_past.sql` supersedes the earlier
`20261123160000_medication_same_day.sql` rule. Doses scheduled today or earlier
may be marked given in the household time zone; future scheduled days are blocked.
Actual administration time must be finite, non-null and not in the future.
Membership and recorder permissions remain enforced. Existing records are not
rewritten. Keep both versioned migration files; do not edit or repeat applied SQL.

Current source is integrated in main. Read-only 23 November inspection of hosted
log_medication_dose independently confirmed the future-day guard, finite/nonfuture
actual administration time and membership/recorder checks. Do not rerun either SQL
file based on missing ledger entries. Authenticated save/reload/correction still
needs disposable-account acceptance. Local SQL tests are not real dose records;
see verification.md for current suite evidence.
