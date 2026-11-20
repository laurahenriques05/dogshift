# Tasks reliability — 17 November 2026

Integrated source. Read-only hosted ledger inspection on 20 November confirms
20261119112100_tasks_reliability and 20261119112114_task_quick_assignment installed.
Do not reapply the source migrations. This does not establish push delivery.

## Reproduced failures

Isolated PostgreSQL tests failed against the prior implementation in three cases:

- Saving a task due outside the next 180 days returned success without creating
  its first occurrence or reminder.
- A stopped series accepted edits but generated no new dates.
- A family member's departure retained their assignment on open tasks and left
  reminders addressed to a former member.

The task page also filtered out open work older than 90 days or further than
180 days away. API results were not paginated, so a large household could see
incomplete data. Completed history and upcoming dates occupied the same list.

The teammates' exact reported symptom has not been supplied, so these reproduced
issues must not be presented as a confirmed diagnosis of every reported failure.

## Changes

`20261117140000_tasks_reliability.sql` replaces the existing task-save RPC without
changing its signature. It always persists the first chosen date and rejects
edits to stopped series. Existing completed dates retain their attribution and
timestamps. The normal 180-day recurrence horizon remains in place.

A private trigger releases a departing person's assignments in that household
and rebuilds pending task reminders for current members. Completed activity
authorship, other households and previously sent notification history remain
intact. Household deletion in progress is excluded from reconciliation.

The migration repairs existing missing first dates and former-member assignments.
This can queue reminders; it does not call a push service. Review the effect on
old overdue work and any already-running sender before applying it.

The task page loads all materialized open work and 90 days of completed history,
with API pagination and 30 rows displayed at a time. Open and Completed have
separate views. Source links can load older completed tasks explicitly, scoped
to the current household. Unavailable links show an unavailable state.

Editing scrolls to and focuses the form. Recurring edits say Edit series.
Loading errors have a retry action; the form is disabled while data is loading
or unavailable. Household changes remount the page; obsolete loads are ignored.
Returning to the window refreshes the data. This is not Supabase Realtime.

The later experience update replaces this task-page presentation; see
[Tasks and Academy experience](tasks-academy-experience.md). Main's removal of
notifications UI is preserved. The calendar/Home implementation is unchanged.

## Verification

- Feature regression tests run in the isolated full suite; see verification.md.
- TypeScript and production build passed; existing dependency-comment and bundle
  size warnings remain.
- Regression coverage: distant dates, stopped tasks, departure/recipient
  changes, household isolation, month ends, DST, upgrade reconciliation and
  pagination including interrupted loads. Existing deletion tests still pass.
- The local authenticated Tasks page loaded its empty state, populated due time
  and view controls. No task was created or completed in a real household.
- Hosted ledger installation was subsequently confirmed; multi-user browser
  writes and real-device push delivery remain unverified by these local checks.

## Remaining integration validation

With designated disposable accounts: create/reload/complete/undo/stop, edit recurring
work, change occurrence assignee, depart and verify cross-household isolation.
Installed schema is not proof of populated multi-user browser writes. Confirm
exact production commit separately. Sender/configuration, recurrence beyond the
materialized horizon and real-device push delivery remain separate.
