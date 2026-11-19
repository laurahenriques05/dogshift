# Walk editing, routine alignment and live metrics — 19 November 2026

## Scope

The user confirmed that complete timeline editing means changing event times/text
and existing notes while preserving the original GPS coordinates. It does not
mean editing the route geometry. No fake route points or events are inserted.

Routine setup moves to the right of the Walking routine section (below the heading
on narrow screens). The description is removed. The footsteps tile is larger and
its inherited bottom margin is cleared: that margin caused the earlier visual
misalignment despite flex centring. Active GPS metrics overlay the lower map above
credits/scale. Time-only and map-loading states retain readable metrics.

Opening Add a note or Edit timeline and notes hides both action buttons; Cancel
restores them. The correction editor removes Correct this walk, the old long
paragraph and the empty generic Notes box. It uses Starting Time, Finishing Time
and Save. It loads actual recorded notes with individual text/time fields and all
derived timeline events (GPS start/resume/gap/distance milestones, waste, pause
boundaries and walk boundaries). Legacy text is editable only when it exists.
A short device-time-zone caption identifies the local datetime inputs.

Save calls one author/member-checked transaction. The walk revision and the full
expected note set reject stale edits, including a concurrent appended note.
Start/end still must contain the raw GPS. Note IDs remain stable. Event display
corrections are stored separately from GPS samples; raw GPS timestamps and
coordinates remain untouched. Waste timestamp corrections update the original
waste record, preserving its ID/kind. Pause boundaries update duration accounting;
overlapping pauses or pauses over recorded GPS are rejected. All changes roll
back together on failure. A private, RLS-enabled audit table records the before/
after walk, notes and waste. Other household members can read the completed
summary but cannot correct another walker's activity. Anonymous/outsider/former
member restrictions remain server-side. No user-editable metadata authorisation.

## Schema and rollout status

New proposal: `20261119191348_walk_timeline_corrections.sql`.
Requires core Walks, dog-waste, journal/daily-plan, pause/notes and paused-duration
migrations. The shared database is still missing:

1. `20261118200000_walk_pause_and_notes.sql`
2. `20261118223000_walk_paused_duration.sql`
3. The new correction migration above.

The first two already exist in merged source. Read-only hosted inspection found
neither segment_start nor pause_intervals. The current Pause GPS guard therefore
refuses the pause and keeps recording, instead of pretending to stop while the
server cannot preserve segment boundaries/duration. This explains the reported
live clock behaviour; local duration logic already freezes open pause intervals.

Attempted application of the first pause migration was rejected by automatic
approval review: previous approval covered the two routine migrations, and this
additional production change lacked specific coordinated approval. No pause or
correction migration was applied. Explicit scope/team confirmation is required
before retrying; do not bypass the rejected action through raw SQL or a local
clock-only workaround. The new correction migration also requires review with
Laura before hosted application. New editor fields depend on that migration;
older databases show an unavailable-update state instead of claiming a save.
The routine migrations applied earlier must not be repeated.

This source branch has no production release. Another teammate reviews before
merge; passing checks are not that approval. No hosted activity/note/routine was
created or modified during this work.

## Validation

Isolated PostgreSQL tests cover atomic saved-event/note corrections, preserved raw
GPS, author/member/anonymous rejection, stale walk/note snapshots, invalid event
times, pause accounting, GPS-overlap rejection and private audit permissions.
Pure timeline tests verify corrected text/time display without point mutation.
Existing pause tests cover clock freezing, recovery and server validation.

A temporary, removed browser harness rendered the actual components with a stub
Supabase client and a public sample Lisbon route. It verified existing note/event
fields, Start/Finish labels, Save, editor Cancel and both action buttons hidden
while either editor is open. Its fake save response validates UI transitions,
not real hosted persistence. The isolated SQL tests separately validate storage.

At 1280px and 390px the page had no horizontal overflow; the icon/heading centre
difference was zero and the metrics rectangle lay within the map rectangle.
Public map tiles were real. Screenshots contain sample fixture data only. No
physical GPS, locked-screen, account-write or hosted correction test is claimed.
The final header-row responsive grid was a subsequent CSS adjustment; mobile
keeps the verified layout. Full local check results are recorded in the PR.

Final local checks: 252 tests across 57 files passed with VITE_APP_URL and both
Supabase browser configuration values blank, on Node 22.23.5. Typecheck, production
build and diff whitespace checks passed. Existing dependencies were reused rather
than a fresh npm ci. Zod annotation and large-bundle warnings remain.
