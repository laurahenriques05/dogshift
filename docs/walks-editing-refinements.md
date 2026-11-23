# Walk event and note corrections

Approved scope: change all timeline event times/text and existing notes, preserving
original GPS samples/coordinates. Route geometry editing is out of scope.

Edit timeline and notes loads actual journal/legacy notes and derived start/finish,
GPS/resume/gap/distance, waste and pause events. Starting Time and Finishing Time
are inside their own event fieldsets; no repeated visible Event text/Note text,
device-time-zone paragraph, generic empty Notes box or Correct this walk heading.
Accessible input names remain. Save is labelled Save. Add a note and Edit timeline
and notes both hide while an editor is open; Cancel restores them.

Only the recorder/current member may correct. One transaction checks walk revision
and expected note set, rejects stale concurrent changes and preserves note IDs.
Display corrections are separate from raw GPS. Waste times update original IDs/
kinds; pause boundaries update duration. Start/end must contain raw GPS samples;
invalid overlaps/out-of-range events fail atomically. Private RLS-enabled audit
records before/after without exposing it through browser grants.

Successful Save rerenders and opens the corrected timeline immediately, with
refreshed waste events; no manual reload or Walk updated sentence. Other members
read completed summaries but cannot edit another person's activity. Automatic seven-day retention does not grant correction rights to other members.

Installed hosted versions (read-only rechecked 20 November):

| Source | Hosted version |
| --- | --- |
| 20261118200000_walk_pause_and_notes.sql | 20261119192900 |
| 20261118223000_walk_paused_duration.sql | 20261119192909 |
| 20261119191348_walk_timeline_corrections.sql | 20261119192918 |

Do not reapply them. Tests cover atomicity, raw GPS preservation, stale revisions,
permissions, invalid times/pauses and audit privacy. Sample component fixtures
verified note/event fields, save/cancel, immediate corrected display and responsive
layout. No actual hosted account correction or physical-device claim is made.
