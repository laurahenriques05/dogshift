# Walk maps, pause and recovery

Current status: [team sync](carol-walks-team-sync.md). Provider/route code remains
inside Walks. No new map framework or paid service was introduced.

## Maps and controls

MapLibre/OpenFreeMap light vector map is the default; Leaflet is a fallback and
Google is optional when configured (walks-google-maps.md). Standard, 3D mapped
buildings and Esri satellite are supported subject to coverage/renderer. Imagery
failure returns to Standard with feedback. Saved routes without points have an
honest no-GPS state and no map-style picker; live map controls remain available.

Initial location acquisition approaches world zoom 1 to neighbourhood zoom 15.5
in approximately three seconds; reduced motion skips it. Recenter/Fit/history
loads do not repeat that approach. Live following preserves chosen zoom until a
pan; Recenter resumes following. Ordinary scrolling passes to the page; deliberate
pinch, keyboard and +/- remain. No World/Layers icon or unwanted information icon.

Completed routes offer Start/Finish, Fit route and approximately 12-second
Reproduce route/Stop replay. Playback uses saved segments, keeps gaps open and
shows only Start while replaying. It changes no GPS, duration or statistics.
Reduced motion shows the full route. Live routes do not offer replay.

Dog places is opt-in and off initially; hidden means no dog labels/markers or
search requests. Controls belong to setup/live maps, not history. Already observed
POIs remain at moderate zoom-out in bounded session memory; very distant views
hide them. See walks-nearby-timeline.md for external-query privacy and limits.

OpenFreeMap/OpenMapTiles/OSM and active imagery credits appear only in the small
persistent app footer, visible above mobile navigation and map-dialog backdrops.
No duplicate credits in/under non-Google maps. Preserve Google's native credits.
Source licences remain in public/licenses/walk-map-style.txt. Provider requests
can disclose IP/viewed map areas; no offline tile scraping/prefetch was added.

## Pause, notes, metrics and recovery

Pause stops recording and freezes elapsed time; resume creates a new segment.
Accepted points/pause intervals and finish intent are saved on the original device
before retries. Late callbacks are ignored. Saved duration excludes pauses. Only
acknowledged buffers are cleared; real storage/network failures remain visible.
Active GPS metrics sit near the map's lower right beside the lower-left scale.
Time-only states keep readable metrics without pretending to have a route.

Connection lost stops GPS collection without ending the walk. Its compact alert
is centred, with only a heading/Reconnect. Online alone does not restart GPS;
Reconnect verifies connectivity, flushes the existing queue and resumes the same
walk in a fresh segment. Manual pauses/queued finishes are respected. No points
are collected during the detected outage and its gap is not drawn. Earlier
points remain; no operating-system settings are changed. Missing schema, permission and sequence
errors must not be mislabeled as internet loss. No background reliability promise.

Journal notes and event correction are documented in walks-journal-daily.md and
walks-editing-refinements.md. The related pause/notes and duration migrations are
installed (20 November read-only ledger verification); do not reapply them.

## Evidence

Pure/isolated SQL tests cover segment/duration/queue/retry/privacy and map helpers.
Sample browser fixtures exercised actual public vector/satellite tiles, playback,
controls, connection retry and mobile containment. This is not physical GPS,
Google production verification or successful public Overpass integration.
