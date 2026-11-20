# Collar overview and daily walk periods

Walks reuses its existing provider, start dialog, daily plan/check RPCs, waste
records and note journal. There is no new schema, framework, calendar, notification
system or backend service. The active recording screen and history remain intact.

The idle card follows Feeding's green/cream layout: next routine slot on the left
with Start walk; actual completed/marked outings in the middle with progress and
the latest nondeleted recorded start in household-local HH:MM:SS; an animated
line-art collar/tag/phone on the right. Counts include completed real walks and
manual attestations, and can exceed the target without being silently capped.
Manual attestations have no invented start time, so the caption explicitly says
Last recorded start. Loading/missing plans do not fabricate a target or next slot.

Today's walks presents connected circles, the same dark-green completion language
as Health, a drawn check and Summary. It omits dates, clock times and Given /
Scheduled labels. The configured number remains unchanged. Three slots are
Morning / Afternoon / Night; two are Morning / Night; one is the central Afternoon
slot. Larger counts are distributed across those periods with numbered labels.
These are presentation labels for routine slots, not inferred actual outing times
or newly saved appointments. Existing chronological assignment of completed walks
is preserved; the labels do not prove that a walk occurred during that daypart.

Selecting a pending circle explicitly records a completed manual outing via the
existing idempotent RPC. Start walk keeps the original GPS/time-only setup. A
completed circle or Summary opens a keyboard-accessible modal with actual waste
totals and legacy/journal notes; pending entries remain marked pending. Pending
slots cannot show a saved summary. Manual attestations truthfully explain that no
detailed walk/waste/note record was collected; only their author can undo them.
Checks and the next slot update from one shared feature-local routine hook so
the overview and timeline do not issue duplicate routine reads.

## Collar NFC

Set up collar tag reveals a copyable public HTTPS route:
`<VITE_APP_URL>/walks?action=start&household=<household UUID>`. It contains no
credentials. The existing authentication/membership/confirmation flow remains
required. Session intent preserves the household through the existing sign-in
redirect; a mismatched selected family blocks automatic opening of start setup.
Expired intent is discarded. A stale router effect cannot re-arm a consumed
intent after the browser URL has changed. Legacy unscoped links remain compatible.

The illustration animates the phone and signal with reduced-motion support. It
is an illustration, not evidence of a connected/written tag. This change does not
physically write a tag or add a browser NFC promise. A compatible writer/trusted
phone app configures the collar once; everyday tapping opens PawShare. iPhone
browser NFC writing is not claimed. The old separate leash NFC card is replaced
by these compact collar controls. Real-device/tag scanning still needs validation.

## Validation and release

Pure tests cover period labels, next unfinished slot, real-world day boundaries,
deduplication, latest exact start, public scoped URLs, intent expiry, household
mismatch and sign-in scope retention. Existing isolated backend tests cover the
unchanged RPC permissions. No hosted account data or schema was mutated.

A temporary browser harness used clearly labelled example responses: overview,
Start walk opening the existing dialog, mark/undo, next-slot/progress updates,
summary with 2 pee / 1 poop and both legacy/journal notes, manual-summary honesty,
NFC setup link, Escape/focus and desktop/390px layouts were verified. The harness
and viewport override were removed. Actual NFC hardware, clipboard and physical
GPS were not tested. No fixture response is shipped.

No new migration is needed, but routine/journal availability still depends on the
previous Walks rollout. UI source does not prove those migrations are installed.
This branch requires teammate review before merge/deployment.
