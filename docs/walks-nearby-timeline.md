# Dog places and the walk timeline

The active walk keeps DogShift's existing green/cream cards, typography and
buttons. A responsive map/timeline layout is inspired by the requested reference,
without adding its unrelated goal features. Notes and GPS pause are now described in [map controls](walks-map-controls.md). Live maps label the
moving endpoint Current position, hide route replay, follow new samples until the
user pans and offer Recenter to resume following. Completed routes retain replay.

## Nearby places

MapLibre route/start maps highlight dog-related POIs from their existing
OpenMapTiles `poi` source by original class/subclass. These real map labels load
with the visible street tiles as the user moves; they do not depend on a separate
search service or transmit anything beyond the existing tile view. Google/Leaflet
retain their provider basemaps as well as the optional search overlay.

Route maps also offer an explicit, session-only Search nearby dog places checkbox. Before it
is enabled, no places request is made. The adjacent information disclosure explains that the
approximate map area is shared with Private.coffee’s public Overpass service. The browser
sends a bounded public query to https://overpass.private.coffee/api/interpreter, rounding
its centre to 0.01 degrees and searching within 2 km; it never sends a route,
account identifier, walk identifier or exact GPS fix. The currently displayed
results are within 1.2 km of the last recorded sample. Requests refresh after at
least 400 m of movement and one minute, with a 25-second timeout, cancellation on
close/disable and explicit retry. Results are limited to 100 source objects and
40 nearby markers. This is a public best-effort service, not complete worldwide
coverage or a production availability guarantee. The map and recording continue
independently of search failure.

Categories: veterinary care, hospitals whose mapped veterinary facility name
identifies them as hospitals, dog parks, pet shops/grooming, animal boarding,
shelters and training. Private/no-access and explicitly dog-excluding results are
excluded. Boarding/shelter/training records tagged only for other species are
excluded. A veterinary label does not imply emergency services or opening hours.
Source names are displayed as text, never injected HTML. MapLibre, Leaflet
fallback and Google Maps receive the same markers. Each result links to its
public OpenStreetMap object. Overpass's centre for an area is not its entrance.

Provider and tag references:
- https://overpass.private.coffee/
- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://wiki.openstreetmap.org/wiki/Animals
- https://wiki.openstreetmap.org/wiki/Tag:leisure%3Ddog_park
- https://wiki.openstreetmap.org/wiki/Key:animal_boarding

## Timeline and recording mode

Timeline entries are derived from existing saved GPS samples and waste events:
walk start/end, first GPS position, every 500 m of accepted continuous distance,
and a GPS resumption after a sample gap. Gaps never contribute guessed distance.
Times use the household time zone. No place visit/park entry is inferred simply
from proximity. Reopening a completed walk rebuilds the route milestones from its
stored points; there is no new event table or migration.

At the end mode hides the entire waste panel while actively walking. Controls
appear only in the end confirmation or completed summary. End-only events never
appear in the journey timeline, because their submission time is not the time
the dog relieved itself. During mode uses the saved server timestamps and updates
the timeline after confirmation; retry IDs remain idempotent. Existing SQL/RPC
permissions remain unchanged; this is a display/timeline change.

## Verification and limits

Parser/filter/privacy and timeline tests use synthetic/public examples. Public
Overpass requests previously failed/timed out; successful fixture markers do not
prove provider availability. Google/Leaflet runtime, physical motion, network
changes and background GPS remain separate device checks. No place visit is
inferred from proximity. Event/note corrections now overlay the derived timeline
without changing GPS; see walks-editing-refinements.md.

Dog layers are hidden until opt-in. Already observed POIs are retained in bounded
session memory (250) from zoom 10 to moderate zoom-out; detailed tiles take over
near zoom 16 and very distant views hide extra markers. Unknown/unmapped places
are never invented. Credits are only in the persistent footer (Google native
credits remain), not an information control. Current status: team sync.
