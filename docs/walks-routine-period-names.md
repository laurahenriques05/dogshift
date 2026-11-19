# Estimated-time routine names — 19 November 2026

## Source behaviour

Edit routine is fixed at 132 × 120 px on desktop and 92 × 104 px on narrow
screens, anchored at the top. It no longer stretches as the adjacent form grows.
Walking together again shows the real completed-walk total for the selected
household-local period. The statistics chart still offers only distance and time;
there is no completed-count chart or count measure option. Demo/manual checks do
not create real completed-walk statistics.

Routine setup now requires one valid HH:MM estimated time for every configured
walk. A selected town/city supplies approximate coordinates for daily sunrise.
This uses the existing explicit Photon search (query submitted only on Find place);
there is no automatic GPS permission request. The locality choice was the stated
default while awaiting the optional user preference question. Coordinates/label
are stored in the household-private routine, protected by its existing RLS.
The selected location is not inserted into a GPS route.

Naming uses the current household-local calendar day and household time zone:

- Morning: the estimated sunrise inclusive until 12:00 exclusive.
- Afternoon: 12:00 inclusive until 20:00 exclusive.
- Night: 20:00 inclusive until sunrise; pre-dawn times belong to Night.

The user's explicit 20:00 rule overrides both early and late sunset, so sunset
is not used as a variable evening boundary. Times are estimates only: starting
or finishing a walk at a different actual time is allowed. No task, calendar
appointment, reminder or punctuality check is created.

One outing in a period gets Morning Walk, Afternoon Walk or Night Walk. Multiple
outings get 1, 2, … in chronological HH:MM order, not the order fields were entered.
Equal times use stable field order. Saves sort times chronologically so the next
routine slot agrees with the displayed order. Night numbering follows the local
calendar day (00:30 precedes 21:00). Overview, circles, manual-check labels and
summary share these routine names. These describe routine slots, not retrospective
renaming of saved GPS history or reassignment of actual outing timestamps.

Sunrise is calculated locally from the selected coordinates/date using the
[NOAA fractional-year equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF),
including leap-year length, time-zone conversion, DST and date-line handling.
It is an estimate, not observed sunrise or a guarantee of astronomical precision.
No coordinates are sent to a solar API. Polar days/nights or invalid calculations
produce no invented dawn: uncertain early slots retain neutral Walk N labels and
show an explanation. Noon/20:00 labels remain known. Sunrise-dependent names are
recomputed each household-local day.

## Proposed database change and rollout

`20261119195302_walk_routine_schedule.sql` is proposed and **not applied** to
shared Supabase. Coordinate review/order with Laura after routine preferences.
It adds the routine locality and a membership-checked set_walk_routine_schedule
RPC; one required HH:MM per configured outing is checked in SQL and the browser.
Missing/null/invalid times and invalid coordinates/labels are rejected. Authenticated
outsiders and anonymous callers cannot save. No authorisation uses editable
profile metadata; shared database types are not overwritten.

Existing routines, manual checks and walks are preserved. The migration does not
invent missing times or a place. Older incomplete routines show a completion
prompt and neutral names rather than fabricated schedule labels. Legacy count-
only saves now reject missing estimated times; older clients must refresh to
configure their locality/times. Explicit Remove routine remains supported.
No hosted migration, activity write, merge or deployment was performed here.
A source/preview build does not establish production rollout or persistence.

## Verification

258 tests in 58 files passed with VITE_APP_URL and both Supabase browser variables
blank on Node 22.23.5, followed by typecheck/build and whitespace checks. Existing
dependencies were reused; this was not a new npm ci. Existing Zod/bundle warnings
remain. Tests cover the user's 09:30/11:30 example, noon/sunrise/20:00 boundaries,
chronological numbering, invalid/missing times, winter/summer estimates, DST/date
line conversion, polar sunrise absence, legacy-data preservation and SQL permissions.

A removed browser fixture rendered the real routine components with local state
and a Supabase stub that rejects access. The public Photon search returned Lisbon;
the user-selected sample location and 09:30/11:30/20:30 produced Morning Walk 1,
Morning Walk 2 and Night Walk. Save was disabled until location and all times were
present. Edit routine stayed 120 px high before/while configuring on 1280px and
104 px before/while editing on 390px. No horizontal page overflow was observed;
routine circles use their existing horizontal scroller on narrow screens.
Screenshots are fixtures, not real saved household data or hosted migration tests.
