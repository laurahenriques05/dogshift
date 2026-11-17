# Walk dog waste recording

## Flow

Confirm current/selected location opens **Record Dog Waste** before any walk is
created. The walker chooses Yes/No. Yes reveals **During the walk** / **At the
end**. The final Start walk creates the walk and its preference atomically.
Cancelling/back navigation does not create a walk. The location preview watcher
stops on entering this setup step. GPS recording begins through the existing
provider only after final confirmation.

During mode exposes Record pee / Record poop on the active walk. End mode
exposes them in the finish dialog and completed summary (including walks that
ended automatically). Each press creates one event; there are no guessed events.
The summary displays counts and explicitly labels an empty list as no entries
recorded, not proof the dog did not pee/poop. Older walks without settings and
opted-out walks are marked as not tracked. Only the walker can add events.

## Persistence, security and migration

New, unapplied migration: `20261116170000_walk_dog_waste.sql`.
It adds `walk_waste_settings`, `walk_waste_events`, `start_walk_with_waste` and
`record_walk_waste`. Existing migrations, shared routes and shared database types
are unchanged. Feature-local API typing is temporary pending coordination of
the migration and shared generated types with Laura/affected owners.

The wrapper uses the existing authenticated start RPC inside one transaction.
Retries preserve the original preference and existing duplicate-start rules.
The recording RPC checks membership, walker identity, undeleted state, enabled
mode and valid kind in SQL. Event IDs make retries idempotent and conflicting
reuse fails. Table writes are denied to clients. RLS keeps active settings and
events private to the walker; household members can read after completion.
Outsiders cannot read them. Deleted walks cannot receive new events.

A failed save retains its event ID in the component and offers Retry records;
other additions stay disabled until the pending save is resolved. This queue is
in memory, not durable offline storage. Keep this page open and retry after a
connection failure. No real emails or notifications are sent.

## Verification and release status

183 isolated tests pass, including local PGlite migration execution, atomic start,
invalid choices, mode preservation on retry, event deduplication/conflict,
rejected direct writes, enabled/disabled recording, household/outsider access,
privacy before/after completion, final recording and deleted-walk rejection.
Typecheck and production build pass.

Browser check (local): manual location confirmation opened Record Dog Waste;
Start walk was disabled until a Yes/No answer; Yes revealed both timing choices;
At the end was selected successfully. Final Start walk was not submitted during
verification, and no hosted database records were created by this check.

No hosted migration, deployment or team approval is claimed. Recording against
the hosted database and the new start RPC require migration review/coordination
and explicit authorization to apply it. Until then, the new final Start walk
request cannot succeed against a database missing the migration. The branch is
`codex/walk-start-location`; remote push remains unavailable due to HTTPS Git
credentials, so no PR has been created. Background GPS remains a separate,
unverified capability; this feature does not change that limitation.

## Optional GPS / time-only walks

Start Walk now opens Track your route? before any location permission query or
geolocation subscription. No skips the map/location step and goes to the waste
options (with the Record Dog Waste heading). Yes retains location
confirmation followed by those same waste choices. Both finish with Start walk.

The new append-only migration `20261116190000_walk_tracking_choice.sql` adds
track_gps to feature settings and an atomic start_walk_with_options RPC. Existing
rows default to GPS enabled. Retrying start preserves the initial saved choice.
A database trigger rejects GPS point inserts for time-only walks. The provider
checks the persisted choice before touching geolocation, including on resume,
and reloads it when recovering an active walk. Timer-only UI hides GPS resume,
map, distance, pace and stationary-GPS controls. Completed details show duration
and waste summary without a route. Backgrounding does not create a GPS request;
elapsed time is derived from timestamps, not a requirement for timer ticks to
keep running while the screen is off.

Both feature migrations remain unapplied to hosted Supabase and require team
coordination/review. No shared generated database types were changed. The test
suite now has 184 passing tests; a local database test covers persisted no-GPS
choice, retry preservation, rejected point insertion and final waste recording.
Browser verification confirmed No opens waste options with no map and Yes opens
location confirmation. No hosted walk was started by these checks.

## Setup visual polish

The time-only explanatory paragraph is removed from the initial GPS-choice step.
Location and waste steps use a compact left-arrow Back text action at bottom
right. Recenter has an opaque app-cream background and smaller label/icon/padding,
with an expanded touch hit area. The alternative heading “Potty breaks” is a
proposal only; the current Record Dog Waste heading is retained pending feedback.

## Combined filter screen

The initial screen now shows Track your route? with Any filters? alongside it.
Route Recording with GPS location and Record Dog Waste are native checkbox
switches, dark green when enabled. Both default off. Enabling waste reveals the
existing During the walk / At the end radio choices on the same screen.
GPS on proceeds to location confirmation, which now starts the configured walk
directly. GPS off starts the time-only walk directly from filters. The extra
waste-preference screen is removed; Back from the map preserves both switches
and the timing choice. No persistence/schema changes in this UI revision.
Browser inspection verified both switches and conditional timing options; final
Start walk was not submitted and no hosted walk was created during the check.

## Filter copy alignment

Any filters? now inherits the same typography and color as Track your route?.
The timing prompt reads “When would you like to record your dog waste?”.
A renewed location investigation reproduced `Code 1: User denied Geolocation`
and permission `denied` in the Codex in-app browser; this is not proof of the
cause in the user's Safari session. No new GPS fix is claimed without that
session's native response. The timestamp normalization remains in place.

## History status filter and hero spacing

Past Adventures has a Not deleted / Deleted selector alongside its period picker.
Both filters run before pagination and reset the page limit when changed. Deleted
history includes only the current walker's completed deleted walks, without demo
entries, and does not contribute to existing totals or charts. Deleted cards
link to the existing detail/restore view and do not request their private route.
The existing Recently deleted by you links remain available. No schema change.

The hero heading now uses the same vertically centred text stack and icon gap as
activity cards, with less space above the description and more before Start walk.
Local browser verification selected Deleted and showed the existing deleted
records with View or restore walk links; no restoration/deletion was performed.

The visible feature name is now **Potty breaks** / **Record potty breaks**,
including setup, loading, error and summary copy. Internal schema names remain
unchanged. Timing asks “When would you like to record your dog’s potty breaks?”.

## Naming preference correction

Dog waste / Record Dog Waste wording is restored. Alternative names are proposals
only and must not be substituted without the user's selection.

## Restoration from deleted history

Deleted cards now expose Restore walk directly, without navigating into the old
deleted-detail card. The action opens a centred native modal with “This walk was
deleted and excluded from family history.” and a dark-green Confirm walk
restoration button. Cancel/Escape closes it; focus returns to the triggering
control. Duplicate submissions are guarded and errors keep the modal open.
Confirmation uses the existing set_walk_deleted RPC, verifies deleted_at=null,
reloads history and switches to Not deleted. It does not recreate the walk,
route, notes or waste records, so existing summaries remain attached to the same
ID. The local database regression confirms waste records survive deletion and
restoration and become readable to household members again.
The redundant Recently deleted by you section is removed from the landing page.
Start walk now follows the heading at the right edge of the hero card.
Browser inspection verified Restore walk opens the centred dialog. Confirmation
was not submitted on hosted records during verification. No new migration.

## Deleted previews and card deletion

The Deleted badge is removed from cards in the Deleted filter. Restore copy is
“This walk was deleted from family history.” Cards belonging to the current user
have a small top-right delete cross in saved history and Last Adventure. Other
members' walks and development fixtures do not expose a delete control. The
cross opens the same centred modal with “This walk will be deleted from family
walks' history.”, Confirm delete and Cancel. This is reversible soft deletion
through the existing owner-checked RPC, followed by status verification and reload.
No hosted record was deleted by browser verification: only the modal was opened.

Deleted cards now load existing GPS previews and read-only dog waste summaries.
New unapplied migration `20261117130000_deleted_walk_owner_preview.sql` allows
the current member/author to read their own deleted route/settings/events.
Other household members still require a completed, non-deleted walk; outsiders
and former members retain no access. No writes or security settings are widened.
This migration depends on the earlier waste tables and requires coordination,
review and explicit hosted application authorization. Until applied, hosted RLS
continues hiding deleted GPS routes; do not claim that live preview is verified.

186 isolated tests pass, including the new policy migration in local PGlite:
the author reads retained route/waste after deletion, members/outsiders cannot,
unauthorised restoration is rejected, and restoration restores family reads
without losing the original records. Typecheck/build pass. UI inspection verified
the centred delete modal without confirming a hosted delete.

## Selector hover and confirmation focus

Walk period, deletion status and statistics-measure pickers now use a feature-local
accessible listbox so Safari/macOS native menu styling cannot override the pale
green hover treatment. Arrow keys/Home/End move focus, Enter/Space select,
Escape/outside click close, and Tab leaves the picker. Selected options show a
check mark. Confirmation dialogs initially focus their container, removing the
automatic brown ring on Confirm delete; keyboard button focus remains visible
in muted green. Browser inspection checked opening the period list, moving focus
with ArrowDown, closing with Escape and the clean initial confirmation button.
No real walk was deleted during verification. No schema or permission change.
