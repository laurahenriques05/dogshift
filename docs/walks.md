> Current product change: history now retains the last 168 hours from completion;
> member-name titles replace Your/Family walk and manual deletion UI is removed.
> Hosted physical retention and its once-per-minute schedule were installed and
> verified on 23 November after confirmed Maria/Laura approval. Minimal private
> Tasks completion receipts remain; GPS/notes/waste are removed with each walk.
> See carol-walks-team-sync.md for exact source/hosted versions and evidence.

# Walks implementation and rollout

Current state: [team sync](carol-walks-team-sync.md). Source lives in
src/features/walks. This document describes approved behaviour, not deployment
history. Never infer hosted installation from a migration filename.

## Routes and feature boundaries

- /walks: start/setup, recording, optional routine, summaries, Last Adventure and
  the final NFC tag disclosure. Shared shell/auth/household guards remain.
- /walks?view=history: Past Adventures, period filters and 20-entry paging; no Demo/Deleted selector.
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
On an offline event or a detected network save failure, GPS collection stops while
the same walk and its earlier points remain. Online events do not restart GPS.
Reconnect verifies the server, flushes the existing queue and resumes that same
walk only if GPS was running before the outage. A manual pause stays paused;
a queued finish is saved without restarting. Fresh fixes begin a separate segment,
so the outage is neither drawn nor included in route distance. The compact dialog
shows a connection heading and Reconnect only, centred in the viewport. Physical-phone acceptance remains
pending; simulated-provider checks are recorded in verification.md.

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

Completed walks older than 168 hours are physically removed by the installed
once-per-minute retention job, regardless of author or soft-deletion state.
Routes, notes and waste are not archived. Minimal private receipts retain linked
Task completion; active walks are not purged. The current UI has no Deleted view,
manual removal/restore actions or Demo walks. Earlier deletion proposals remain
in Git/migration history but are not current rollout work. See team sync for
approval, exact installed versions and live evidence. Do not reapply them.

## Routine, summaries and maps

- [Routine rules and slot identity](walks-routine-period-names.md).
- [Journal/manual checks](walks-journal-daily.md).
- [Event/note editor](walks-editing-refinements.md).
- [Maps/pause/recovery](walks-map-controls.md), [nearby places](walks-nearby-timeline.md).
- [Waste and deletion](walks-dog-waste.md), [history/statistics](walks-demo.md).
- [Collar overview and NFC setup](walks-collar-overview.md).

## Hosted migration mapping — core checked 20 November; retention 23 November

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
| 20261122215728_walk_seven_day_retention.sql | 20261123142032_walk_seven_day_retention |
| 20261123142121_enable_walk_retention_schedule.sql | 20261123142146_enable_walk_retention_schedule |

Never rerun installed capabilities under their source timestamps. Source filename
ordering is not a hosted upgrade plan. Read-only 23 November set_walk_routine
inspection confirms required membership and input order, but allows partial/blank
hours. Strict-hour hardening must reconcile fixed periods with stable slot identity
before reviewed rollout. The old solar/sorting and manual family-deletion proposals
are superseded; none is permission to install old SQL. Review complete dependencies
for a new isolated backend; never reset the shared project or edit applied SQL.

## Verification limits

Tests use isolated PGlite/minimal Auth/Storage roles, pure GPS/queue helpers and
sample component fixtures. They do not establish physical NFC, email recovery,
all hosted writes, Google billing/key readiness or locked-screen GPS. Keep fixture,
read-only hosted schema, actual account write and phone evidence separate.
Use docs/verification.md for checks and docs/collaboration.md for releases.
