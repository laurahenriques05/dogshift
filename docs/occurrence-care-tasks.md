# Occurrence-based Feeding and Walks tasks

Integrated source: supabase/migrations/20261120140000_occurrence_care_tasks.sql.
Read-only 23 November inspection confirms save_care_task, record_task_meal,
start_task_walk and assignment/completion contracts on the hosted project. Manual
installation is not fully represented in the ledger. Do not reapply the file;
reconcile exact definitions before any new shared schema change. Live two-member
browser acceptance remains separate from function presence.

## Existing contracts and files

- `src/features/tasks/TasksPage.tsx`, `data.ts`, `board.ts`, `model.ts`: the existing
  task series/occurrences, paged reads, household-local schedule and legacy tasks.
- `src/features/tasks/calendarData.ts`, `CalendarPage.tsx`, `tasks.css`: shared
  source calendar; existing restocking and Health events remain intact.
- `src/features/tasks/care.ts`: action routes, guarded occurrence loading and
  actionable pending/error copy.
- `src/features/feeding/FeedingPage.tsx`, `PlannedMealForm.tsx`: saved meal plan,
  explicit meal confirmation, existing stock and correction rules.
- `src/features/walks/WalksPage.tsx`, `WalkProvider.tsx`, `waste.ts`: existing start
  dialog, explicit GPS choice, recording, recovery and saved finish flow.
- `src/lib/supabase/database.types.ts`: additive care fields/RPC contracts.
- Existing RPCs reused: `generate_task_occurrences`, `get_household_members`,
  `save_meal_result`, `start_walk_with_options`, `finish_walk` / paused finish,
  `archive_household_task`. Generic task creation/completion remains supported.

## User flows

New tasks offer Feeding, Walk, Health and Other. Feeding/Walk tasks ask for the
saved meal or walk name, date/time and responsible member. Health/Other restore
free-name general tasks, with optional details and the existing manual completion.
These choices do not create clinical records. The follow-up calendar-topic change
persists Health/Other through a separate atomic RPC and adds subject filters;
see [calendar topics](calendar-topics.md) for its installed-definition evidence.
The responsible member defaults to you; choosing Unassigned remains explicit.
Recurrence stays in Advanced options. An unassigned occurrence can be taken;
changing responsibility only updates that occurrence. There is no rotation,
scoring, balancing or new notification delivery.

**Feeding:** Open meal -> guarded family/type lookup -> existing saved bowl ->
explicit Confirm meal. `record_task_meal` uses the existing meal RPC and its stock
transaction. A previously confirmed bowl for that routine and family day is
reused. Confirming the same bowl directly in ordinary Feeding also reconciles
its task. A skipped meal or empty/failed record cannot complete a task.
Changing/removing the actual meal re-evaluates completion. A historic missed meal
stays pending: use Change details to record its actual time only if it really
happened on the scheduled day; today's feeding does not invent yesterday's meal.

**Walks:** Start walk opens the existing dialog; merely opening a URL never
starts a walk or GPS. Only its explicit confirmation calls `start_task_walk`,
which uses the existing start/options RPC and links that real walk. A pre-existing
unrelated active walk cannot be attached silently. The task remains pending
until the linked walk has a saved end. Existing pause/GPS/finish/retry behavior is
unchanged. Explicit legacy source removal reopens its task; automatic seven-day retention
preserves real completion through minimal private receipts. Stopping a recurring series preserves
an already linked walk, including one started before its scheduled time.

The calendar projects the same occurrences, with action, time, responsible member
and state. Feeding/Walks have distinct green accents/icons. Overdue/unassigned
items are highlighted. Mobile shows the selected day's agenda before the
horizontally scrollable month, with no page-wide horizontal overflow.

## Server guarantees

- Authenticated, active same-family membership is required for every new RPC.
  Assignment targets must be active family members. Membership locks prevent a
  departure racing a new assignment.
- Per-occurrence `original_assigned_to` and assignment history preserve the
  original person, changes, actor, timestamp and version. Real source authorship
  determines `completed_by`, independently of who was assigned.
- Row locks plus expected assignment version reject stale/concurrent takeovers,
  including a change away and back to the original assignee.
- Unique source IDs prevent one meal/walk completing multiple occurrences. One
  saved routine meal can have only one task per household-local date; overlapping
  recurrence schedules are rejected rather than producing two bowls/tasks.
- Completion is checked against the linked, live source and served food entries
  or actual saved walk end. Legacy manual completion/undo cannot bypass this.
- A stable quick-create request ID prevents a repeated save creating a second task.
- Meal advisory locks and the existing household transaction prevent a duplicate
  bowl or stock deduction on retries. Existing normal Feeding validations remain.
- Care tables/history are read-only through member-scoped RLS; mutation is via
  restricted RPCs. History is cleared only by normal family/account lifecycle;
  leaving a family releases open responsibility and preserves original history.
- Existing generic tasks retain their existing workflow. They are not guessed
  into Feeding/Walks from their titles; recreate any such old task with its actual
  type/meal to opt into verified care completion.

## Verification and rollout limits

Tests use an isolated PGlite database with all migrations, not the shared project.
They cover creation, recurrence assignment isolation, take/change, stale versions,
outsiders/former members, real meal and walk completion, denied fake completion,
retry deduplication, normal Feeding reconciliation, corrections/deletions,
source-day matching, active-walk preservation and legacy task behavior.

The browser verification uses the real Tasks/Calendar/meal-form components with
an isolated temporary database and test authentication. It checks mobile (390px)
and desktop, quick creation/assignment, take/change, the real meal RPC, calendar
state and navigation, loading/empty/connection-error states. It does not validate
hosted permissions, a real-device GPS session or a live multi-client network race.
The row-lock/CAS concurrency contract is tested with stale requests; full parallel
transactions need a staging PostgreSQL integration check after migration review.

Data refreshes on route entry/return to the window. No realtime subscription,
notification system or deployment is introduced. Device GPS/background behavior
continues to have the existing Walks limitations. Before claiming end-to-end
completion, repeat the two-member Feeding/Walks smoke test with disposable hosted
accounts, including rejected actions and save/reload. Notifications are out of scope.

General Health/Other task creation is integrated. Local SQL-to-calendar tests
cover actual Feeding confirmation, one stock deduction, linked Walk finish,
correction and explicit assignment. Browser fixtures use temporary data only;
current test counts and evidence limits are in verification.md.
