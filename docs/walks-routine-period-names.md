# Walking routine — approved rules

Current release/pending SQL: [team sync](carol-walks-team-sync.md).

## Setup and naming

Routine is optional and shared per household dog. Without a complete plan the
heading is Walking routine and Set routine remains available. No No routine for
now button or fabricated default plan. A saved plan changes the heading to
Today's walk. Edit stays disabled until saved and while the form is open.
Remove appears only in edit mode: Save routine, Remove routine, Cancel.

Choose 1–12 daily outings and required Estimated hours for every slot. Save is
clickable unless saving; native required validation and explicit FormData/HH:MM
validation explain missing hours, avoiding stale React state disabling Save.
Actual outings need not occur at the estimated minute.

| Period | Local interval |
| --- | --- |
| Morning | 07:00 inclusive to 12:00 exclusive |
| Afternoon | 12:00 inclusive to 20:00 exclusive |
| Night | 20:00 inclusive to 07:00 exclusive |

No sunrise/sunset/geolocation belongs to routine setup. Blank/invalid hours have
no period name. Names update while entering hours. Group Morning, Afternoon,
Night immediately; blank fields follow. Single period slots have no number;
repeated slots use stable planning/insertion order, not sorted estimated time.

Example: 09:00, 17:00, 21:00 plus newly added 15:00 displays Morning, Afternoon 1
(17:00), Afternoon 2 (15:00), Night. The stored array stays [09,17,21,15] so old
Night slot 3/manual checks retain their identity. Stable input IDs preserve focus.

96px circles have centred bounded short labels (Afternoon 1), no hours or Walk.
Long plans scroll within the circle row, never the whole page. Hero titles use
Morning Walk, Afternoon Walk 1, Night Walk. There is no duplicate saved sentence.

## Automatic progress and summary

Actual nondeleted starts fill first free planned slots in the matching period
and household-local start day, deduplicated by walk ID and ordered by real start.
Ongoing walks fill a dark circle with in-progress status, not completed Summary.
Finish makes Summary available automatically. Overflow stays in real totals/history,
never fills another period. Overnight uses the start day. Deleted walks free slots;
restored walks reassign. Legacy count-only plans retain their old handling until
estimates are completed. Manual attestations occupy stable slots; no fake GPS/time.

Overview counts the same completed slots as the circles, including explicit
manual checks; active walks are not completed. Empty is 0,
without Last recorded start. No NEXT WALK without a complete plan. A saved routine
gives Start walk the pale Feeding-style background. Walking together retains total
completed walks, distance and duration; charts offer distance/time only.

Walk Summary is a centred native dialog with centred title and Close summary.
Dog waste/Notes are matching smaller bold headings, using existing waste symbols
without the old divider. Summary sits below the circle. Manual outing explanation
uses two separate centred sentences and aligned Undo/Close controls; only the
attestation's author may undo it.

## Persistence and verification

Current client uses required_count/routine_enabled/estimated_times and the existing
membership-protected RPC, with no solar columns. Hosted RPC preserves input order
but still permits optional/partial hours. Strict SQL estimates and stable-identity
proposals are unapplied; see walks.md before any coordinated rollout.

Tests cover boundaries, progressive/stable numbering, original slot IDs, manual
checks, automatic active/finish/overflow/deduplication/date/delete/restore behaviour,
validation and RPC rejection. Real-component fixtures covered grouping/focus/save,
summary and 360/390px/desktop containment. These are not real hosted routine writes
or physical-phone validation. Neither rejected layout template was implemented.
