# Walk map controls, pause and notes

## Behaviour

The existing PawShare styling is preserved. Location confirmation has a three-second
approach (reduced-motion preferences skip animation). Dragging pans in all directions;
zoom controls/pinch and Recenter remain available. A GPS explanation appears before
the browser request. Location failure retains retry and time-only alternatives.

Standard remains the default. 3D adds mapped building heights and a tilted camera;
coverage depends on source data. Satellite uses Esri World Imagery over the full
map, beneath route and position overlays. Imagery failure returns to Standard.
Resolution/availability vary worldwide; this does not guarantee 3D coverage in every
place. A simplified fallback map cannot provide the vector renderer's 3D buildings.
Provider attribution is retained in the map's expandable information control.
Satellite source: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer

Search nearby dog places is off initially. Both dog-related basemap labels and
additional markers are hidden while off; popups close when disabled. The adjacent
information disclosure retains provider/privacy/error details without permanent
paragraphs below the checkbox. Optional Overpass requests remain best effort.

Active walks show small GPS-quality and saving badges. Saved is shown only after
a server acknowledgement; offline queued points remain labelled pending. Verbose
GPS guidance is folded into help. Pee/Poop use line icons; final-only recording
hides those controls and excludes those records from the route timeline.

Pause GPS keeps elapsed time running and flushes accepted points. Resume starts a
new segment so distance and the drawn route do not bridge the pause. Late callbacks
from an old watcher are ignored. Each accepted point and pause intent is persisted
on this device immediately. Reopening an active walk recovers queued points and
shows a recovery state; the user resumes GPS explicitly. No background tracking
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
