# Vaccination records

Current source specification; owner Beni. Hosted installation/deployed functions
must be checked against actual definitions and Beni/Laura reports before rollout.
A missing ledger row does not prove manual SQL was never applied. See
health-calendar-links.md for newer source-link/modal and reported migration status.

Health → Vaccination records (`/health/vaccinations`). Current family members may create/read/edit all records, as agreed. Confirmed deletion is available after the separate vaccination-deletion migration. Preserves medication and appointment work.

Fields: vaccine name, given date for administered records, optional veterinarian-supplied next due date, veterinarian/clinic, batch number, notes. Upcoming vaccinations can have a due date without a given date after the summary-followups contract; they are excluded from administered history. These are date-only records, stored as Postgres dates. The family timezone determines today, future-date validation and due/overdue labels. No vaccination recommendations or automatic intervals. Server and client reject future given dates and next dates on/before given dates. Creator/editor and audit timestamps are set by a database trigger. Household reassignment and audit spoofing are blocked by column grants. Edits use last-write-wins; no full revision history.

## Schema dependency and rollout verification

Review and coordinate application of `supabase/migrations/202611110004_vaccinations.sql` once. It depends only on the initial household schema/helpers and its hosted installation must be reconciled before any application. Do not rerun earlier migrations. No environment changes.

## Verification

Run `npm test` and `npm run build`. Embedded Postgres tests execute the migration and exercise family isolation, shared editing/creation, anonymous and former-member rejection, audit protection, forbidden deletion and invalid dates. Client tests check date validation and due states.

After migration application, open Health → Vaccination records, create a disposable record, refresh and edit from another member account. Check missing next date, overdue/today/future next dates, offline save/load/retry, denied access, family switching, 375px layout and keyboard use. Hosted Supabase and browser interaction still need manual verification.

## Shared calendar

Notifications are out of scope. Date-only next_due_on semantics and source links
remain authoritative; no second scheduler or calendar store is introduced.

Next due dates now appear as date-only entries on the Health calendar, derived directly from vaccination records. No duplicate appointments/events are persisted. Changing/clearing next_due_on updates/removes the entry on the next calendar load. Each entry links to its source vaccination for editing. No notifications or shared calendar infrastructure are created.

## Remove a mistaken record

All current members may delete vaccinations after explicit confirmation. The schema dependency is `20261111220004_vaccination_deletion.sql`; reconcile actual definitions/reports before applying it. Delete is available beside each history record and within its edit form; cancellation leaves it untouched, errors allow retry. Successful deletion reloads the history; next-due calendar entries disappear on the next Health load because they are derived from the source record. No separate calendar rows require cleanup.
