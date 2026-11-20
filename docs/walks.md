# Walks implementation and rollout

Current state: [team sync](carol-walks-team-sync.md). Source lives in
src/features/walks. This document describes approved behaviour, not deployment
history. Never infer hosted installation from a migration filename.

## Routes and feature boundaries

- /walks: start/setup, recording, optional routine, summaries, Last Adventure and
  the final NFC tag disclosure. Shared shell/auth/household guards remain.
- /walks?view=history: Past Adventures, period/status filters and 20-entry paging.
- /walks/:walkId: saved detail, route, notes/waste/timeline and author corrections.
- /walks?action=start&household=<UUID>: public NFC URL, authenticated/member flow.
- /walks/gps-test: memory-only location diagnostic; no saved walk or upload.
- /walks/learn: legacy redirect to Walks; Academy is dog-trick training.

One dog per household; no Lost Dog Mode, live family location sharing, second NFC
app, feature-specific calendar or invented activity/statistics.

## Recording and persistence

Start chooses GPS and waste mode explicitly. GPS requires HTTPS/device consent
and location confirmation; time-only remains available. Numeric accuracy and real
errors remain; the approximate-location warning paragraph was intentionally removed.
GPS samples originate from the phone, never the collar tag. Duplicate starts are
protected by a per-dog transaction lock/active-walk uniqueness and retry semantics.

GPS_POLICY currently uses accuracy <=50m, minimum interval 5s, accepted speed
<=5m/s and maximum continuous gap 60s. Implausible/noisy samples do not invent
travel. Segments and gaps remain unconnected. Distances are stored in metres,
displayed in kilometres; duration and pace exclude pauses.

Pause GPS freezes elapsed time/recording, flushes accepted samples and persists
pause intent locally. Resume creates a new segment and ignores stale callbacks.
Points, note queues and finish intent survive recoverable failures on the original
device where storage is available. Only acknowledged batches are removed; pending
saves are not shown as cloud-saved. Finish freezes at its intended end instant,
retries idempotently, then opens the saved detail. Storage/network failures stay
visible. Cross-device transfer of an unfinished local queue is not implemented.

GPS inactivity warning: after 2 minutes within 30m with fresh continuous GPS,
a centred dialog asks “Still on your adventure with (dog name)?” Yes resets the
check, No finishes, and 5 unanswered minutes automatically finishes. Once shown,
the prompt retains its deadline even if GPS changes; gaps/hidden pages cannot
initiate a warning. Pause clears it. Phone/background timer reliability remains
unverified; follow walks-gps-testing.md. During a walk the recorder sees only the
active recording, its controls and connection/save errors.

## Privacy and mutation rules

Metadata is household-readable subject to deletion rules. Ongoing GPS/notes are
private to the recorder; current members read the completed route. Direct browser
writes are revoked. RPCs enforce membership, ownership, validation and retries.
Other household members cannot append, finish or correct the recorder's activity.

Approved deletion change: any current member may soft-delete a completed family
walk; restoration/correction remain author-only. The merged UI offers it, but the
hosted deletion RPC is still author-only until the reviewed new migration is
applied. Deleted history remains author-only; no ongoing walk can be deleted.
The author/current member can also permanently remove an already deleted,
completed walk after confirmation. The proposed permanently_delete_walk RPC
deletes the row and cascades GPS/waste/notes; existing task links become null
and their completion guards remain in force. Both deletion RPC rollouts need
team review. Do not broaden private-route SELECT policies.

## Routine, summaries and maps

- [Routine rules and slot identity](walks-routine-period-names.md).
- [Journal/manual checks](walks-journal-daily.md).
- [Event/note editor](walks-editing-refinements.md).
- [Maps/pause/recovery](walks-map-controls.md), [nearby places](walks-nearby-timeline.md).
- [Waste and deletion](walks-dog-waste.md), [demo/statistics](walks-demo.md).
- [Collar overview and NFC setup](walks-collar-overview.md).

## Hosted migration mapping — inspected 20 November 2026

The shared project is jqxeszipztucnqcywkab. Some source timestamps differ from
hosted ledger versions because installations were coordinated separately.

| Source migration | Hosted version/name |
| --- | --- |
| 202611110001_walks.sql | 202611110001_walks |
| 20261116170000_walk_dog_waste.sql | 20261117134845_walk_dog_waste |
| 20261116190000_walk_tracking_choice.sql | 20261117134905_walk_tracking_choice; alignment 20261117134920 |
| 20261117130000_deleted_walk_owner_preview.sql | 20261117134935_deleted_walk_owner_preview |
| 20261119001000_walk_journal_and_daily_plan.sql | 20261119172420_walk_journal_and_daily_plan |
| 20261119165100_walk_routine_preferences.sql | 20261119172455_walk_routine_preferences |
| 20261118200000_walk_pause_and_notes.sql | 20261119192900_walk_pause_and_notes |
| 20261118223000_walk_paused_duration.sql | 20261119192909_walk_paused_duration |
| 20261119191348_walk_timeline_corrections.sql | 20261119192918_walk_timeline_corrections |

Do not rerun any installed capability under its source timestamp. In particular,
filename ordering alone is not a safe hosted upgrade plan. These later proposals
are absent from the inspected hosted ledger:

- 20261119195302_walk_routine_schedule.sql: superseded solar proposal; not an
  approved product requirement. Never deploy alone.
- 20261119203310_fixed_walk_routine_periods.sql: location-free strict estimates,
  but sorts input; must be reconciled with stable slot identity.
- 20261120152152_preserve_walk_routine_slot_identity.sql: final order-preserving
  compatibility/hardening proposal; test the combined dependency chain.
- 20261120155307_shared_walk_history_deletion.sql: required for family deletion.
- 20261120215833_permanently_delete_walk.sql: proposed author-only permanent
  removal of completed, deleted walks; tested against the complete local chain,
  including task-source cleanup. Not applied to the hosted project.

For a new isolated project, review the complete migration chain and dependencies;
for the existing hosted project, reconcile actual definitions/ledger first. Apply
only reviewed, explicitly authorized changes. Do not reset, edit applied files,
apply solar requirements or rerun teammates' installations.

## Verification limits

Tests use isolated PGlite/minimal Auth/Storage roles, pure GPS/queue helpers and
sample component fixtures. They do not establish physical NFC, push/email delivery,
all hosted writes, Google billing/key readiness or locked-screen GPS. Keep fixture,
read-only hosted schema, actual account write and phone evidence separate.
Use docs/verification.md for checks and docs/collaboration.md for releases.
