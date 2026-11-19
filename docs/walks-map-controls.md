# Hosted status update — 19 November 2026

Pause/notes and paused-duration are now installed in shared Supabase as ledger
versions `20261119192900` and `20261119192909`, after explicit user confirmation
of coordinated team approval. Do not reapply them. See the current
[rollout record](walks-editing-refinements.md#schema-and-rollout-status).
The unapplied-proposal statements below describe earlier implementation history;
physical GPS/phone validation remains distinct from the verified schema rollout.

# Walk map controls, pause and notes

## Behaviour

The existing PawShare styling is preserved. Location confirmation has a three-second
approach (reduced-motion preferences skip animation). Dragging pans in all directions;
zoom controls/pinch and Recenter remain available. The GPS switch is the explicit setup choice before the browser request. Extra
permission/help paragraphs were removed at the product owner’s request. Location
failure retains retry and time-only alternatives.

Standard remains the default. 3D adds mapped building heights and a tilted camera;
coverage depends on source data. Satellite uses Esri World Imagery over the full
map, beneath route and position overlays. Imagery failure returns to Standard.
Resolution/availability vary worldwide; this does not guarantee 3D coverage in every
place. A simplified fallback map cannot provide the vector renderer's 3D buildings.
Provider attribution remains in a small text strip, without an information icon.
Satellite source: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer

Search nearby dog places is off initially. Both dog-related basemap labels and
additional markers are hidden while off; popups close when disabled. The checkbox is shown only during setup/active recording; history has no dog-place
controls. Its tooltip identifies the approximate-area search provider. The view
picker sits on the map itself. Satellite labels use larger text and a white halo
with larger outlined place markers. No additional information icon is displayed. Optional Overpass requests remain best effort.

Requested GPS/saving/recovery badges and help/reminder sections are removed. A
short saving caption still distinguishes queued points from acknowledged saves.
Connection failures show a centred Internet Connection Failure alert, which can
be dismissed without ending GPS. Browser offline/online events and actual network
errors drive the alert; schema/permission/sequence errors are not misclassified. Pee/Poop use line icons; final-only recording
hides those controls and excludes those records from the route timeline.

Pause GPS now freezes elapsed time, distance and recording, then flushes accepted points. Resume starts a
new segment so distance and the drawn route do not bridge the pause. Late callbacks
from an old watcher are ignored. Each accepted point and pause intent is persisted
on this device immediately. Reopening an active walk recovers queued points and
restores its controls; the user resumes GPS explicitly without a recovery badge. No background tracking
guarantee is made for locked phones, closed pages or suspended browsers.

Add a note stores a per-user/per-walk draft locally while editing, and an
author-only RPC saves it. Expected-note comparison prevents silent cross-device
overwrites. Failed saves keep recoverable drafts where device storage is available.
Completed walks offer a simple summary with the detailed timeline folded.

## Migration and release

`20261118200000_walk_pause_and_notes.sql` is a proposal, **not applied to hosted
Supabase**. Coordinate ordering/contracts with Laura and obtain teammate review
before applying. It adds `walk_points.segment_start`, preserves append retry
checks, excludes pause gaps from server distance and adds author/member-checked
`set_walk_note`. Existing auth/RLS and private storage are not weakened.
The client checks segment support before pausing; on an older database it leaves
GPS running and reports that the capability is unavailable. Notes remain local
drafts if their RPC is missing. Do not claim cloud notes/pause are deployed.

## Verification

Isolated database tests cover authors, other members, outsiders, deleted walks,
stale edits, idempotent note/point retries and distance across pause segments.
Pure tests cover map layers, reduced motion, status honesty and buffer recovery.

An uncommitted browser harness used an example Lisbon route and intercepted
account responses: no real account walk or note was written. Real vector tiles,
3D buildings, full-area satellite imagery and map drag were observed. The harness
verified recovered note drafts after reload, permission explanation before the
mock GPS request, icons, compact credits and checkbox state. Hardware GPS pause,
physical motion, locked-screen recovery and actual hosted RPCs were not tested
by that fixture. Public Overpass success and Google/Leaflet runtime still need
separate validation. The temporary harness is removed from source.

A teammate reviews before merge/deployment; no production release is part of
this implementation.

## Latest refinements and checks

Automatic device framing uses neighbourhood zoom 15.5 in all modes. Only initial
location acquisition has the three-second approach. Active/history map loads and
Recenter/Fit route do not replay that approach; live following preserves the
user's zoom. The location icon is larger and vertically centred with both lines.
The note editor retains an accessible name without a visible Walk note label.
End confirmation no longer has the requested extra sentence.

GPS callbacks continue persisting each accepted point before cloud sync. A failed
append leaves the queue untouched; only acknowledged batches are removed. Finish
intent is stored before sending and completion is displayed after acknowledgement.
Reconnect triggers retry. Existing isolated tests cover recovered queues, idempotent
RPC retries, author permissions and pause boundaries. Device storage failure is
reported rather than promising durability when storage is unavailable. Real mobile
network-loss/locked-screen testing remains required.

The refinement browser harness used public example map areas and a simulated
connection failure, with no account writes. History omitted the checkbox; actual
satellite tiles displayed Centro Veterinário Berna and Kiwoko with stronger labels,
then hid both when disabled. The centred alert was captured and dismissed without
ending the preview. Test fixture removed after use. No additional migration or
hosted data change was performed for these visual/connection refinements.

## Pause clock and finish summary refinement

Pause stops the watcher and freezes the elapsed clock at the pause instant. Resume
closes that interval when recording restarts; missing movement is never bridged.
Pending finish intent freezes the clock at its recorded end time even offline.
Pause intervals and draft notes are stored in the original device buffer. Each
interval is recovered after reopening; the latest timestamp wins across tabs.

`20261118223000_walk_paused_duration.sql` is an **unapplied proposal** following
the pause/notes migration. Coordinate ordering and shared contract review with
Laura before hosted application. It stores pause intervals on the finished walk
and adds an author/member-checked, idempotent `finish_walk_with_pauses` RPC. Invalid,
overlapping, out-of-range and conflicting finished intervals are rejected. Saved
duration, history totals and pace exclude paused time; existing walks without
intervals keep their previous duration. Shared generated types are not changed.
The client gates Pause until both segment and timing schema support are present.
Active pause recovery is on the original device; cross-device transfer of a
not-yet-finished pause journal is not implemented.

Finish confirmation shows the latest note, including the in-memory/device draft.
During-mode waste totals are read-only in that confirmation and after completion;
end-mode controls remain available as intended. A changed draft is saved with
expected-note conflict protection before finish acknowledgement, so failed notes
keep completion pending and recoverable rather than silently dropping text.
Replayed note writes are idempotent. Server-saved notes remain in the final summary.

Completed summaries use the existing author-only top-right delete cross and
centred delete confirmation. Add/Edit note and Edit timeline and notes sit on one
row (wrapping on narrow screens). Walk Timeline has no duplicate internal heading.
Dog waste has no top divider. Recenter sits at the starting map’s bottom-left,
clear of provider credits. Satellite labels now use smaller white text with a
soft dark-green halo instead of thick white backing.

The Internet Connection Failure button reads Reconnect and invokes sync. Failed
reconnection keeps the alert open; no operating-system network change is implied.
An isolated browser fixture verified that behaviour, aligned note/edit buttons,
Recenter placement and a typed-but-unsaved note in the finish summary alongside
2 pee / 1 poop totals and no recording controls. Real map tiles verified the
softer satellite labels. No real account data was written; the fixture is removed.
Isolated database tests validate ownership, invalid intervals, finish retries and
paused duration. No hosted migration or production deployment was performed.
