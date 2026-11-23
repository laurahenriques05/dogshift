# Calendar topics

The calendar filters All, Feeding, Walks, Health and Other. A Health task and a
clinical record share a subject filter but keep distinct labels and source links:
Task opens Tasks, Appointment opens appointments, Vaccination/Medication open
record links. Food restocking belongs to Feeding. Selecting a general-task
category never creates a clinical record or guesses a care kind from its title.

## Installed contract

Source: 20261121120000_task_calendar_topics.sql. Owner reported manual SQL success
on 22 November. Read-only 23 November inspection independently confirmed category
columns on task_series/task_occurrences, Health/Other constraints, the inheritance
trigger and save_categorized_household_task definition. Manual installation is
not in the inspected migration ledger: do not reapply based on that absence.

The atomic RPC checks current membership, validates category, delegates task
validation/save and updates open occurrences. Completed history keeps its category
and recorder. New recurrence dates inherit the series. Existing uncategorized
records remain Other. Care Tasks retain actual Feeding/Walk completion rather than
becoming manually completable general tasks. Old client signatures remain compatible.

## Current calendar and checks

Current sources are defined in calendar-care-routines.md, including routine and
actual-activity projection; the older task-only audit is superseded. Stable source
IDs avoid duplicate stock/restocking/activity entries. Notifications are out of scope.

SQL tests cover round-trip, future recurrence inheritance, completed history,
invalid categories, legacy defaults, outsiders and anonymous calls. UI fixtures
covered filters, clinical labels, form explanation, Escape and 390px containment.
See verification.md for current suite results. Live two-member save/reload and
source-time labelling still need a disposable-account smoke test; no shared
clinical/care records were created to supply that evidence.
