# Tasks reliability

Reliability and quick assignment are installed as
20261119112100_tasks_reliability and 20261119112114_task_quick_assignment
(20 November read-only ledger check). Do not reapply their source timestamps.
Current presentation: tasks-academy-experience.md.

## Preserved guarantees

- Save persists the first occurrence even outside the normal 180-day recurrence
  horizon; stopped series reject edits rather than claiming an ineffective save.
- Series edits preserve completed author/time and historical/overdue work.
- Departure releases only that household's open assignments. Original responsible
  person, completed activity and other households remain intact.
- Occurrence assignment uses row locks and expected assignee/version to reject
  stale edits; repeated same-target retries are harmless.
- Stable paged reads load all materialized open work and 90 days of completions.
  Source links can load an older completion only inside the active household.
- Household-scoped loads ignore stale results and refresh on focus; no Realtime
  subscription or infinite background recurrence generation is claimed.
- Legacy queue recipients stay consistent with assignments/corrections, but
  notifications are out of scope and no sender delivery is promised.

## Verification

Isolated tests cover distant dates, recurrence/DST/month ends, stopped series,
departure, stale assignment, membership/outsider denial, recipient consistency
and interrupted pagination. Current full-suite evidence: verification.md.

Live create/reload/complete/undo/stop, occurrence reassignment and household
isolation still need designated disposable multi-user accounts. Installed schema
is not evidence of these browser writes. Review exact production separately.
