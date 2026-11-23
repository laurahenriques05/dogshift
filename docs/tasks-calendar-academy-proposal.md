# Tasks, calendar and Academy contracts

Current owner: Maria. See tasks-academy-experience.md for UI,
occurrence-care-tasks.md for real care completion and calendar-care-routines.md
for source projection. The historical filename is retained for existing links.

## Tasks

One-time/daily/weekly/monthly series support interval 1–52 and an optional final
local date. Repetition retains household-local time; a missing month-day clamps
to the last day. Occurrences materialize in bounded windows, with original first
dates and overdue work preserved. Editing/stopping a series affects future open
work, not completed history or a linked active walk.

Current members assign/take one occurrence using expected-version protection.
Only the completion recorder can undo generic completion. Care Tasks complete
only from a real linked saved meal/walk; a title or due time is not proof.
Unassigned tasks are valid. Departure releases open responsibility while preserving
original responsibility/history. General Health/Other categories do not create
clinical records. Requests and source IDs remain stable/idempotent.

## Calendar

One shared month calendar projects Tasks, Feeding routines/actual meals/restocking,
Walks routines/checks/actual activity and Health appointments/doses/vaccine dates.
Filters are All, Feeding, Walks, Health and Other; each entry opens its source.
UTC instants display in household-local time. Date-only records retain date-only
semantics. Edits disappear/update on reload/focus; no duplicate calendar store or
Realtime subscription is claimed. See calendar-care-routines.md.

## Academy

One progressive 11-challenge dog-trick path. Old non-trick IDs/history remain
internal; /walks/learn redirects to Walks. Stable module IDs protect saved progress.
Reading never completes a challenge. Explicit checklist achievement grants 10 XP
once per household/module; each 50 XP advances a level, badges at 1/5/20 modules.
Parts grant no XP. Any member's saved practice contributes to the household-local
streak. Only authors edit/delete practice. Removing a practice may change the
streak but does not revoke an earned shared achievement/XP/unlock.

Use academy/lesson-template.md for content conventions, not a new curriculum.
Academy curriculum, Tasks reliability and quick assignment were confirmed in the
20 November hosted ledger; do not reapply source filenames with different timestamps.

## Notifications are out of scope

Carol confirmed on 23 November that notifications will not be implemented.
Existing queue/preferences/RPC/send-push source is compatibility infrastructure,
not product work to finish. Do not configure delivery secrets/cron, deploy the
sender, add reminder UI or connect producer adapters without a new explicit task.
Do not remove installed queue infrastructure as a side effect of documentation.

Feeding forecast IDs remain food-restock:<product UUID>. occursAt/remindAt already
represent buy-by time; do not subtract the lead twice. Zero expected consumption
produces no forecast. These are in-app calendar/forecast contracts, not push proof.

## Evidence and limits

Local SQL/model/component checks are in verification.md. Shared multi-account
save/reload/assignment/completion and rejected actions still require disposable
live accounts. Some capabilities were applied manually and are absent from the
ledger; reconcile definitions before any schema work. No new permission or service
change is implied by this document.
