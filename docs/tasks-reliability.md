# Tasks reliability — 17 November 2026

Base: `origin/main` at `9958938`. Work branch: `codex/tasks-reliability`.

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

The notification settings retry fix is included. The calendar/Home implementation
from Laura's PR #33 is unchanged.

## Verification

- Full isolated suite: 202 tests in 43 files passed.
- TypeScript and production build passed; existing dependency-comment and bundle
  size warnings remain.
- Regression coverage: distant dates, stopped tasks, departure/recipient
  changes, household isolation, month ends, DST, upgrade reconciliation and
  pagination including interrupted loads. Existing deletion tests still pass.
- The local authenticated Tasks page loaded its empty state, populated due time
  and view controls. No task was created or completed in a real household.
- Hosted migration execution, multi-user browser writes and real-device push
  delivery remain unverified by this change.

## Review and rollout

1. Laura reviews the new migration and task API behavior. Beni should include the
   family departure/account-deletion interaction in her review.
2. Review CI and the preview, then merge the reviewed branch.
3. Laura checks the hosted schema and migration ledger. Apply only
   `20261117140000_tasks_reliability.sql` if it is still absent, after the team's
   backup/recovery step. Do not repeat the existing Tasks/Push/Academy migrations,
   edit applied migrations, reset the database or run an automatic `db push` over
   the unreconciled history.
4. Validate with designated test accounts: create, reload, complete, undo, stop,
   edit recurring work, depart and verify cross-household isolation. Test data is
   explicitly disposable; it is not actual dog-care activity.
5. Confirm the production deployment serves the reviewed merge commit.

Notifications still require a separate sender/configuration audit, recurring
materialization beyond the existing horizon, source adapters for Feeding/Health,
and iPhone/Android delivery tests. Passing these task tests does not close those
items.
