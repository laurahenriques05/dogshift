# PR #12 review corrections — 15 November 2026

This branch now incorporates the updated Tasks/Academy branch at
`48c44277b8f9db14fb043f19f5cccb6e2f932721`, which already integrates main
`13b2672` and fixes anonymized task completions. The earlier integration was
based on `9e432462b3073f5d47e3adb9f3003b5abbc9e7a4`. The two conflicts retain both public
Google Maps/VAPID configuration examples and both Health and shared-feature CSS.
Health's dose query links from PR #15 and the Walks Academy redirect are retained.
No local environment file was copied or changed.

## Corrections

- Completed tasks retain their timestamp when the author's account is deleted.
  The shape constraint allows a null author only when a task is completed (or
  both fields are null). The completion RPC checks an existing timestamp and
  uses null-safe author comparison so another member cannot claim or undo an
  anonymized completion. A null completion command is rejected.
- Stopping a task removes future open occurrences, triggering cancellation of
  pending reminders. Overdue and completed history remains in the database and
  in Tasks. Archived series no longer offer edit/stop controls. Calendar reads
  the same surviving source rows. Existing future open dates of already archived
  series are cleaned by the correction migration too. If the recorder later undoes
  an early completion of a stopped future date, that date is removed rather than
  resurrected as an open calendar event.
- Undoing a completion can restore a cancelled reminder, but cannot reset a
  notice already marked sent or currently claimed by the sender. Repeating an
  undo does not create additional reminder rows. The same protection covers
  assigned reminders, unassigned household reminders and overdue escalations.

## Migration coordination

`20261115140000_task_review_fixes.sql` is a new, append-only correction after
`20261114120000_tasks_academy.sql` and `20261114130000_push_notifications.sql`.
The earlier migrations match the updated Tasks/Academy branch, including its
account-deletion fix and regression assertions. The full local migration chain includes
20 files. The correction needs review with Maria/Laura and Beni before hosted
application. Applying Tasks/Push alone does not include these corrections.

The previously communicated four-step rollout now also needs this final
correction. Inspect the actual target schema and migration ledger first; use
one responsible person and the team's agreed backup procedure. Apply only
missing reviewed migrations, in filename order, stopping at the first failure.
Do not repeat migrations reportedly already installed, including
`vaccination_deletion`. This document does not establish their hosted status.
No hosted migration, data write, Auth setting change, Edge Function deployment,
main merge or production release was performed here.

## Verification

The deletion regression uses disposable PGlite data and the complete migration
chain: a second member completes a task, leaves the family, requests account
deletion, passes the privileged preparation and is deleted from the test Auth
table. It verifies the completion survives without an author and another member
cannot claim or undo it. No real Auth users are deleted.

Additional PGlite regressions cover archive/history/calendar consistency,
other-household archive rejection, regeneration of archived series, cleaning
existing archived dates, sent-reminder deduplication and restoration of unsent
cancelled reminders. Delivery RPCs are exercised locally; no push is sent.

Automated checks do not validate phone/browser delivery, background GPS, live
Storage, actual hosted migrations or concurrent in-flight network delivery.
Push setup and real-device validation remain a later phase. Group-member review
and CI are required before integrating these corrections into PR #12.

Checks on the prior fix revision: fresh `npm ci` reported no vulnerabilities; Node 22.23.5
ran all 164 tests in 34 files with one worker and the extended hook timeout.
The three regression cases were also run against the original PR commit and
failed for the reviewed reasons, then passed with these corrections.
Typecheck, production build and `git diff --check` passed. The build retains the
existing dependency-annotation and large-bundle warnings. Health and Walks source
files match current main; the earlier Tasks/Push migrations match PR #12 at
`48c4427` exactly. Local verification is not formal group-member approval.

## Refresh from PR #12 at 48c4427

The refresh keeps the upstream account-deletion constraint, null-safe completion
checks and its regression assertions. The later correction RPC retains the
upstream explicit rejection of undoing an open occurrence, alongside the stopped
future-date cleanup and null-command validation. The compatibility constraint
replacement in the correction migration also remains valid after the updated
Tasks migration.

Both text conflicts (`.env.example` and shared CSS) use the updated Maria version,
which already contains the public Maps/VAPID settings and both feature style
sets. Stopped-task history and sent/in-flight notification guards are retained.
The exact refreshed SHA and fresh test/CI results are recorded in PR #16.
