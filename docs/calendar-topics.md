# Calendar topics

The calendar filters subjects, not database origins: All, Feeding, Walks, Health,
Other. A Health responsibility (such as booking a visit) and a scheduled clinical
record appear under Health. Their labels and links remain distinct: Task opens
Tasks, Appointment opens appointments, Vaccination/Medication retain record links.
Food restocking belongs to Feeding; verified feeding/walk tasks use their saved
care kind. Home calendar labels use the same event-kind helper. No clinical record
or duplicate calendar row is created by choosing Health for a task.

## Persistence and history

Migration: `20261121120000_task_calendar_topics.sql`, after the existing
Tasks reliability and occurrence-care migrations. On 22 November 2026 the project
owner reported SQL Editor Success after running the supplied category migration.
Treat this as owner-reported installation, not an independently inspected ledger
or completed two-member save/reload test. Do not rerun it because an older note
calls it unapplied. On 23 November a read-only anonymous REST check was denied
for both task tables (42501); permissions were not changed and this response does
not establish the installed column/function definitions.

General task series/occurrences gain a Health/Other category; missing historical
categories remain Other, with no inference from task titles. General-task editing
can reclassify open occurrences, including overdue work, while completed history
keeps its original category and author. Newly generated recurrence dates inherit
the series category. Care tasks retain verified Feeding/Walk completion and cannot
be reclassified as general manual tasks.

`save_categorized_household_task` wraps existing validation, membership and save
logic in one transaction. Invalid categories, failed saves and unauthorized calls
leave no partial category/task changes. The original RPC signature remains for old
clients; an old client's edits keep the existing series topic. A pre-migration
client read treats absent categories as Other; the new save RPC fails visibly if
not installed and never reports fake success. Existing RLS/private storage and
notification delivery settings are untouched.

## Verification

- Full isolated suite: 297 tests across 68 files passed; typecheck and build passed.
  Existing bundle-size and dependency-annotation advisories remain.
- Added SQL coverage: category round-trip, recurrence inheritance beyond the rolling
  horizon, completed-history preservation, general legacy defaults, invalid category,
  outsider RLS and anonymous RPC rejection. Subject tests combine Health tasks and
  clinical records, keep source links/labels and do not infer from titles.
- Actual local UI checked at 390px and desktop: subject filter, clinical event
  labels, Health task form explanation, Escape cancellation. Mobile document width
  remains 390px; only the existing month grid scrolls. No task or clinical record
  was created/edited in the shared project during browser checks.
- Hosted category-saving/reload with two members remains unverified; migration
  installation was reported successful by the owner. SQL saves use a disposable PGlite DB.
- The original implementation did not apply hosted SQL; the later owner-reported
  installation is recorded above. This feature does not enable notifications or
  change Academy curriculum.

## Historical Feeding/Walks integration audit — 21 November

The following audit predates the later direct routine/activity projection. For
current calendar sources, see [calendar care routines](calendar-care-routines.md).

A new isolated SQL-to-calendar adapter test executes actual task creation, ordinary
Feeding confirmation, linked Walk start/finish and meal correction, then reloads
`loadCalendarEvents`. It verifies subject filters, stable source links, pending vs
completed state and a single food-restocking event. Normal Walks without task
context do not satisfy an arbitrary walking task; normal planned meals can reconcile
by routine ID and household-local day. This asymmetry is current behavior, not a
claim that any walk automatically clears any task. Calendar shows scheduled tasks
and restocking forecasts, not all routine meals or all completed activity history.

Published browser inspection confirmed both filters contain the existing linked
care tasks, Feeding opens the correct saved bowl, and Walks opens the start dialog.
Both were cancelled, without recording a meal or starting GPS/a walk. A visible UX
mismatch remains: task due time is shown in Calendar, but quick meal confirmation
shows the saved routine time, without distinguishing it from the task time.
Coordinate that UI clarification with Laura; do not change Feeding's stock/save
rules as part of a calendar filter patch. Live completion was deliberately not
performed against real household records.

Twelve focused tests across three files, typecheck and build passed on main
`f942ad8` plus this test; existing build advisories remain. This audit adds only
regression evidence and documentation, no feature behavior, migration or deployment.
