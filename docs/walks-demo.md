# Local presentation history

The local Vite development app includes three presentation records in Past
adventures: Benfica (8 November 2026), Expo / Parque das Nações (9 November) and
Alvalade (10 November). Their IDs are `walk-benfica`, `walk-expo` and
`walk-alvalade`. Legacy demo-prefixed detail URLs redirect to the canonical URLs.

These are synthetic classroom fixtures, not observed walks or real device fixes.
At the user's explicit request their cards/detail pages have no fictional or demo
labels. To prevent unlabelled sample history reaching real households, both the
fixture entries and their detail-page lookup are gated by `import.meta.env.DEV`.
A production build shows only real saved household walks. No example is inserted
into Supabase, assigned a household/user ID or included in Home's real statistics.

In local development they contribute to the selected-period Walks totals and are
interleaved with saved walks by start date. This month contains 3 presentation
walks, 8.32 km and 1h 59m (7,150 seconds before time formatting). Internal distance
calculations remain in metres; displayed distances use km with two decimals. There
is no presentation-mode switch or session preference in the current UI.

## Geometry provenance and licence

Coordinate arrays live in `src/features/walks/demoRoutes.json`. Synthetic fixes
were generated approximately every 12 metres along public OpenStreetMap street
and path geometry, assigned ten-second timestamps and 3-metre synthetic accuracy.
`demo.ts` derives their distance/time using the same GPS calculation as the real
feature. These routes illustrate the UI, not recommendations for pedestrian access.

Public geometry was retrieved on 12 November 2026. Paths were assembled offline
from connected street/path ways, then sampled and simplified. No routing API is
involved and no OSM contributor account metadata is shipped.

- Benfica: https://www.openstreetmap.org/api/0.6/map?bbox=-9.211,38.744,-9.193,38.756
- Expo: https://www.openstreetmap.org/api/0.6/map?bbox=-9.101,38.757,-9.089,38.772
- Alvalade: https://www.openstreetmap.org/api/0.6/map?bbox=-9.149,38.750,-9.135,38.761

Derived geographic data © OpenStreetMap contributors, under ODbL:
https://www.openstreetmap.org/copyright and
https://opendatacommons.org/licenses/odbl/1-0/.
Mandatory source attribution remains visible on each map. Explanatory provider
banners have been removed. The muted palette is inspired by Apple Maps, not Apple
cartography; no Apple service/token was configured. The default light vector style is stored locally, while its worldwide tiles and
fonts are loaded online from OpenFreeMap; they are not embedded for offline use.
Style notices are retained in `public/licenses/walk-map-style.txt`.

## Try it locally

Sign in, open Walks and select This month. Last Adventure previews the latest
entry; Show more opens all records in Past Adventures. Open each
record or follow the other-walk links. Pinch to zoom or use explicit +/- controls;
ordinary mouse-wheel scrolling must move the page without changing the map scale.
Reproduce route animates the green trace with only the Start marker; Stop replay restores the full route and Finish marker. Fit route returns to the recorded trace. World and double-click zoom are removed.
Real GPS capture and SQL permissions are unchanged. The samples cannot be edited
or deleted as real household activities.

## Walking together summary

The summary selector shares the exact component and arrow styling with Past
Adventures and supports Today, This week, This month and This year. Completed,
non-deleted walks are selected by their start date in the household timezone
(Monday-based weeks). Count, recorded kilometres and total duration update
together from that selection. The bar chart counts walks by local hour for Today,
by day for week/month and by month for year, with empty buckets retained. Hover
or keyboard-focus a bucket for count, distance and duration. Development fixtures
contribute to this chart just as they do to the totals; production uses saved walks
only. No schema or hosted data changes are required.

Statistics are collapsed by default. The bottom-right Show statistics button
reveals the chart (Hide statistics collapses it). Its measure selector switches
between completed-walk count, kilometres and minutes, retaining the summary's
calendar period. Bars start at zero and share an automatically rounded scale with
no fixed value ceiling. Equal counts correctly have equal heights; distance/time
can show differences between equally frequent walking days.

Today now positions bars at the household-local start minute (15:20 appears
between 15h and 16h). Starts within the same minute are combined. Every hour is
labelled, and month views label every calendar day, including February/leap years.
The plot scrolls horizontally on narrow screens to keep all labels legible.
Tooltips and accessible bar labels show only the selected measure and period.
The measure selector uses the same divided chevron control as the period selector.

Monthly tooltips prefix the day with “Day” (for example, Day 10). Time chart
axis ticks and bar tooltips use the same hours/minutes formatter as Total time;
bar heights continue to use the full recorded duration. The measure selector
has a compact arrow area and larger text.

When no completed walks exist in the selected period, Show statistics reveals
only the bold “No completed walks in this period.” message and the existing Hide
statistics button. Chart captions, controls and axes are omitted. Percentage mode
has been removed. Completed walks still uses the existing chart; a dot timeline
(one dot per completed walk) is a proposal awaiting the user's choice.
