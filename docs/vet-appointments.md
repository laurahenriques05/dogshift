# Veterinary appointments

Current source specification; owner Beni. Hosted installation/deployed functions
must be checked against actual definitions and Beni/Laura reports before rollout.
A missing ledger row does not prove manual SQL was never applied. See
health-calendar-links.md for newer source-link/modal and reported migration status.

Scope: create, list, edit and explicitly confirm deletion of shared appointments via Health. No reminders, calendar writes, medical advice or other Health modules.

Review and coordinate application of `supabase/migrations/202611110002_vet_appointments.sql` after the initial schema. Its hosted definition must be reconciled before any application. No environment changes. An unapplied migration produces a visible error with retry, not demo records.

Each appointment belongs to a household (one dog per household). All current members can create/read/edit, including another member’s records. RLS checks live membership. Column grants prevent reassignment and audit spoofing. Browser deletion is available only after the separate appointment-deletion migration; RLS restricts it to current members. Database triggers set creator/editor and timestamps. UTC timestamptz storage; input and 24-hour display use household.timezone, independent of the device. Missing or ambiguous DST times are rejected with an instruction to choose another time. Editing is last-write-wins; concurrent conflict resolution is not included.

## Shared calendar

Appointments already appear through Maria's source projection, with stable source
IDs, household-local times and original Health links. Editing/deleting updates
projection on reload/focus; do not create duplicate calendar records. Notifications
are out of scope. Home's summary is actual data, not evidence of reminder delivery.

## Verification

`npm test` runs embedded PostgreSQL tests against the actual migration, plus timezone tests. `npm run build` checks TypeScript and bundles. This does not verify hosted Supabase, actual migration application or browser interaction.

After coordinated migration application: run `npm run dev`, sign in and open Health. Create a visit, reload and edit it. Use another member to edit the same visit; a different family must see none. Switch families and confirm the list resets. Test empty state, offline load/save and retry. Remove a disposable member and verify reads/writes are denied. Test a device timezone different from the family, DST transitions, keyboard use and 375px width. Use disposable accounts/data; send no emails or notifications.

Health now opens a month calendar of veterinary records, using the same table. Choose a day, press +, and save; select a listed visit to edit. Today and month navigation are available. This is a Health presentation only, with no shared calendar writes or reminder delivery.

## Appointment deletion

All current family members may permanently delete appointments after explicit confirmation, as agreed. Appointment deletion is recorded in the hosted ledger as 20261115152455_appointment_deletion; do not reapply the source file. Select a date and choose Delete, or open a calendar appointment and choose Delete appointment. Confirm/Keep appointment controls prevent accidental deletion; failed requests retain the confirmation and allow retry. Calendar and list reload after success. The shared calendar derives these source records; deleted appointments disappear on the next load.
