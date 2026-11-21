# Calendar topics

The calendar filters subjects, not database origins: All, Feeding, Walks, Health,
Other. A Health responsibility (such as booking a visit) and a scheduled clinical
record appear under Health. Their labels and links remain distinct: Task opens
Tasks, Appointment opens appointments, Vaccination/Medication retain record links.
Food restocking belongs to Feeding; verified feeding/walk tasks use their saved
care kind. Home calendar labels use the same event-kind helper. No clinical record
or duplicate calendar row is created by choosing Health for a task.

## Persistence and history

New migration: `20261121120000_task_calendar_topics.sql`, after the existing
Tasks reliability and occurrence-care migrations. **Not applied to shared Supabase
by this work.** Coordinate with Laura and Beni, inspect actual installed definitions,
review/merge and confirm backup before installing only missing SQL. No reset or
repetition of applied migrations. Deploy the client after this dependency.

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
- Browser category-saving/reload on hosted Supabase remains pending migration
  installation and a two-member smoke test. SQL saves use a disposable PGlite DB.
- No hosted migration, production deployment, notification enablement or Academy
  curriculum/UI change is included.
