# Feeding and Walks in the shared calendar

## Behavior

The calendar reads current Feeding `meal_plan`, Walks `walk_daily_plans`, real
meal/walk activity and manual daily checks through household-scoped queries and
existing RLS. It does not copy plans into task tables or create reminders.

- Daily meals and named walk periods appear automatically, using household-local
  dates/times. Walk routine status reuses `dailySlots`, including active walks,
  manual checks and existing period matching. Meal outcomes use Feeding labels.
- The current month projects current routines from today forwards. Future months
  use the current routine. Past days show actual saved activity only: there is no
  routine version history from which to reconstruct past plans. Editing a routine
  changes future projections; removing it never removes actual care records.
- Normal and extra actual meals/walks/check-ins are shown if not already represented
  by a routine or an explicitly associated task. Deleted records are excluded.
- Feeding tasks replace the same household-day/routine-meal projection. An explicitly
  linked walk replaces that same-day routine's matching activity; a past-due task
  completed on another day does not hide today's actual walk. Pending extra walk
  tasks remain separate: no title/time heuristic guesses their routine slot.
- Extra responsibilities can still be added through the existing Add a task flow.
  Task completion, assignment and source RPCs are unchanged.
- Routine rows open Feeding or Walks; actual completed walk rows open walk history.
  These are source-section links, not a promise to select an individual record.
  Opening a calendar link never records food, starts GPS or starts a walk.
- Routines are labeled separately from Tasks, with estimated hours and real
  Planned/Fed/Skipped/In progress/Completed states. They are not marked overdue
  merely because an estimated walk time passed. DST gaps/folds keep the day and
  display the scheduled clock time with a clock-change label instead of inventing
  a precise instant.

The calendar reads every ledger page in stable ID order for stock estimates;
there is no silent 20,000-row cutoff. New activity reads are also paged. No GPS
points are queried; active-route privacy remains with Walks RLS.

## Dependencies and rollout

No new migration or change to a producer's saved-data contract. Existing Feeding
settings/events and Walks routine/check tables must exist, along with the existing
care-task contracts. Missing/failed reads show the existing calendar error/retry
state rather than invented or partially successful data.

Laura and Carol should review source matching, labels and dates before merging.
Laura coordinates production release. No hosted schema or care records were
changed by this implementation. No notification delivery is enabled.

## Verification

Pure tests exercise projection, household-local boundaries, clock changes,
source-state changes/deletions, routine removal, historical actual records,
extra tasks and explicit link deduplication. A SQL-to-calendar integration test
uses real disposable PGlite RPCs for Feeding, linked Walk start/finish and meal
correction. No shared database is used for automated saves.

Browser checks use real local read-only views at 390px and 1280px: automatic
routine rows and real completion states load, subject filters work, source links
remain available, and the mobile document has no horizontal overflow. No meals,
walks or manual daily checks were recorded by browser checks. Real-phone delivery,
GPS and simultaneous multi-device updates are not claimed. Calendar refreshes on
route entry/window focus; this is not realtime synchronization.

Final checks: 306 tests across 70 files passed with one worker; typecheck,
production build and diff checks passed. Existing bundle/dependency advisories
remain. The earlier audit test is included as regression coverage in this branch.


## Cross-feature review

The calendar remains a projection of source records, not a parallel scheduling
store. Coverage is Tasks (including Health/Other), Feeding routines and actual
meals/restocking, Walks routines/checks/actual activities, Health appointments,
vaccination due dates and medication doses. Follow-up summaries use Health's own
trigger-created appointments/vaccinations, so the calendar must not copy the summary
into another event. Academy, document uploads, vet contacts and weight measurements
are not independent scheduled responsibilities and create no automatic events.

Medication doses now remain visible as Given/Skipped as well as Scheduled/Overdue;
recording a dose no longer silently removes it from the shared calendar. All Health
and product lists are paged; medication schedule IDs are batched to avoid URL-size
limits. A source outage rejects the load rather than claiming a complete calendar.

The Home summary reloads on window focus and re-evaluates household-local dates
across midnight. Request-version guards discard stale results; both calendar views
remount their household-scoped state on family/timezone changes. This preserves
existing refresh-on-return behavior rather than promising realtime synchronization.

Additional isolated coverage executes real medication given/skipped RPCs, vaccine
rescheduling/deletion, one idempotent follow-up from a visit summary, more than
1,000 appointments, a failed producer read and cross-family rejection. Final checks:
307 tests across 70 files passed; typecheck, build and diff checks passed. These
SQL writes used disposable PGlite only. Local browser Health views confirmed real
saved-dose labels/links without changing any shared clinical record. Home focus/
family lifecycle handling was code-reviewed; no hosted multi-client race is claimed.

All additions stay in the same review PR. No hosted migration, delivery setting,
producer write rule or production deployment was changed.
