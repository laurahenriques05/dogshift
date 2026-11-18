# Start Walk location confirmation

## Current flow — device location only (18 November 2026)

GPS walks now require a location delivered by the recording device. The start
sheet no longer offers address search, another location or map-pin selection.
“Confirm location” starts the existing authenticated flow after a valid device
fix. “Retry search again” is always available: it immediately clears the previous
fix, disables confirmation, stops the old watcher and starts a fresh request with
maximumAge=0. Late callbacks from the old watcher are ignored. The old marker is
removed while searching; the next fix recentres the map. Pan, pinch, zoom and
Recenter remain available, but moving the map never changes the device position.
Time-only walks still bypass location access. Both idle and active hero headings
use the same icon/title layout. No database migration or shared API change.

The sections below describe earlier iterations and are historical where they
mention manual locations or place search. Real-device GPS acquisition and
background recording still require phone validation. This source change requires
review by another team member before merging or production deployment.

Validation: all 195 isolated tests pass, including a retry regression that checks
that a new watcher starts without the rejected fix and that old callbacks are
ignored. Typecheck and production build pass. A temporary isolated browser harness
rendered the real StartWalkDialog: GPS selection opened the map with only Confirm
location / Retry search again; retry kept confirmation disabled while awaiting a
fix. This browser check did not obtain a real position, create a walk or write to
the hosted database. The harness was removed after verification.

## Earlier implementation history

Start Walk and the existing `/walks?action=start` entry open a confirmation sheet.
It watches browser geolocation only while open, shows the fix and its accuracy,
and offers another location by explicit place/address search or a map click.
Closing the sheet stops its watcher and aborts outstanding search requests.
The map has the existing light street style with parks, street labels, a position
marker, zoom controls and provider attribution. The initial world view is not a
claimed device location. No database write happens on opening or choosing a place.

Manual selection is currently a preview in the confirmation sheet. Confirming
starts the existing authenticated walk flow; actual GPS samples alone populate
the route. The chosen place is not stored in the database as an origin field.
There is no schema change, hosted migration, auth change or deployment.
The existing server start RPC and recording lock retain duplicate-start protection.
The existing NFC confirmation semantics remain unchanged in this slice.

Place search uses the public Photon service only on form submission (five results,
15-second timeout, cancellation on query change/close). Device coordinates are not
sent to that geocoder. Search text is sent to Photon; map requests reveal the
viewed map area to the existing tile provider. Public Photon has reasonable-use
limits and no production availability guarantee: evaluate a dedicated service
before increasing usage. Documentation: https://github.com/komoot/photon and
https://github.com/komoot/photon/blob/master/docs/api-v1.md.

## Verification

- Isolated unit tests cover worldwide coordinate bounds, invalid positions,
  search encoding, invalid results, empty results and service failure. No network
  or hosted database calls are used in these tests.
- Local browser check: Start Walk opened the sheet; Another location showed a
  search form; submitting Tokyo returned real Photon results; selecting Tokyo
  centred the loaded street map at 35.67686, 139.76389 and enabled confirmation.
  Confirmation was not submitted, so no hosted walk was created by verification.
- Still required on a real phone: allowed/denied permission, timeout and retry,
  GPS accuracy indoors/outdoors, current-location updates, manual pin adjustment,
  keyboard/screen reader navigation and the start-to-recording transition.
- HTTPS is necessary on phones. A desktop localhost URL does not provide phone
  access. Worldwide geolocation is device-dependent; map/search coverage varies.

The change builds on the existing walking-statistics branch (nine commits ahead
of fetched main), preserving that work. Review the prior walk changes separately
or together before merging. Another team member must approve before release.

## Device-location timeout recovery

The confirmation now requests a quick, lower-power device fix (up to 30 seconds
cached) alongside a fresh high-accuracy watch. Only valid positions from the last
60 seconds are accepted. A delayed, worse coarse response cannot overwrite a
recent accurate fix. Temporary GPS errors preserve an acquired position;
permission denial clears it. Both callbacks are ignored after closing/retrying.
A separate 35-second timer ends the loading state even if the browser never calls
back (permission prompts may not count towards browser geolocation timeouts).
Recovery text distinguishes permission blocking from unavailable location and
suggests system Location Services or Safari/Chrome for embedded-browser issues.
No IP-based or invented location fallback is used.

Regression tests simulate coarse-first/precise-later results, delayed responses,
timeout recovery, permission denial, stale positions and cleanup. These are not
real-device GPS evidence. The local embedded browser previously returned a
location timeout; real device acquisition remains dependent on browser/OS support.
The “LET’S HEAD OUT” eyebrow has been removed from the sheet.

## Distinguishing permission from position delivery

On failure, the confirmation sheet now offers Location diagnostics. It reads
browser geolocation permission when supported, follows permission changes, and
shows secure-context status plus the native geolocation error code/message.
Permission queries do not grant or change access. Native error details and
coordinates are not uploaded by diagnostics. A granted permission alone does
not prove that the device can determine a position. Mac recovery guidance points
to Wi-Fi and comparing the device's current location in Maps; this is diagnostic
guidance, not a claim that a system fault has been confirmed.
Reference: https://support.apple.com/guide/mac-help/mh35873/mac.
No confirmed fix for the reported real-device failure yet; the browser/device
and current error still need to be established after authorization.

## Single-watch acquisition revision

Supersedes the concurrent coarse-request/high-accuracy-watch approach above:
the preview now uses one watchPosition subscription with enableHighAccuracy=false,
maximumAge=0 and timeout=30000. The recording provider still requests high accuracy.
This removes competing preview requests and does not require a GPS-grade fix just
to centre the map. Invalid/stale positions now produce explicit diagnostics; the
35-second watchdog reports when neither a position nor error callback arrived.
Tests assert one watch and zero simultaneous one-shot requests, more accurate
updates, stale-fix diagnostics, recovery and cleanup. All 174 tests, typecheck and
build pass. Safari UI validation was interrupted; successful live acquisition is
still unconfirmed. The user's screenshot shows permission granted and secure
context, so do not treat re-granting permission as the established fix.

## Safari timestamp root cause (16 November)

The supplied screenshot finally shows an actual returned position rejected with
an age of exactly 978307200 seconds. This is the Unix-to-Apple reference epoch
difference (1970-01-01 to 2001-01-01), not evidence of a missing location fix or
blocked permission. Earlier permission/device explanations did not establish
the cause of this granted-permission failure.

A shared feature-local timestamp normalizer now preserves recent standard Unix
millisecond timestamps and applies only that exact offset when the corrected
value is within the existing fresh-fix window (60 seconds old / 5 seconds future).
It never replaces an invalid timestamp with receipt time. Stale, nonfinite,
seconds-based and future values remain rejected. Preview validation, recording
and GPS diagnostics use the same normalizer so the corrected start screen does
not lead to timestamp rejection when recording begins. No schema changes.

Regression tests reproduce the screenshot offset, standard times, stale corrected
fixes, future/invalid values, and preview acceptance of actual coordinates with
the observed reference epoch. Live Safari confirmation remains pending.

## Location-map navigation

The start-location map supports drag/pan, touch pinch, zoom buttons and the same
Ctrl+wheel trackpad pinch handler as history maps. Ordinary scrolling does not
zoom the map. GPS updates move the position marker without resetting the user's
chosen view; Recenter returns to the current or manually selected position.
Changing location mode or choosing a manual point centres the relevant location.
The confirmation copy is now: “The route records your phone’s actual GPS
position, and is shared with your family after the walk.”
