# Dog places and the walk timeline

The active walk keeps PawShare's existing green/cream cards, typography and
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

## Verification and release

Tests are isolated: parsing/filtering worldwide points, malformed/private records,
query privacy, date-line proximity, source failures, waste recording modes,
chronological events, deduplication and accepted-distance/gap milestones. Browser
verification uses an example route and intercepted account responses; no hosted
walk is created. Physical movement, background GPS, mobile network changes and
Google Maps runtime still require real-device/project validation. The public
Overpass service may return temporary errors; report those separately from fixture
marker validation. Another teammate reviews before merge and deployment.

Live connectivity evidence: the primary Overpass instance returned HTTP 406 and
the identified Private.coffee instance timed out in the test environment. The
advanced nearby-search success path must therefore be distinguished from fixture
marker tests. Existing-tile dog POIs and GPS rendering remain independent of that
service. Provider availability is not a verified integration guarantee.

Earlier browser evidence (before the opt-in display change): the real visible vector-tile data exposed Vet Planet and
FishPlanet in the example area with additional search disabled. The isolated
search response then displayed a labelled example veterinary hospital and dog
park at their computed distances. End mode hid both controls and a simulated
waste event; switching to During showed Pee/Poop and the timestamped event in
order. Mobile stacking and a 1100px desktop layout were checked with the existing
PawShare styles; the viewport override and temporary harness were removed. No
fixture response is committed or used in the product. Google and Leaflet overlay
code passed typecheck, but their runtime paths were not browser-verified here.

Final checks: all 207 isolated tests, npm run typecheck, npm run build and git diff --check passed. Existing dependency annotation and chunk-size build warnings remain. No migration or production deployment was performed.

Current map controls supersede the earlier always-visible tile POIs: dog-related layers and labels are hidden while the checkbox is off. Provider credits remain accessible through a compact information control. See [current verification](walks-map-controls.md).
