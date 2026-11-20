# Routine names — fixed periods, 19 November 2026

The user's final fixed-hours request supersedes the earlier sunrise/location
implementation. Routine setup no longer acquires or stores device location,
calculates sunrise, requests location permission, or shows the removed location
and time-zone explanation. GPS consent for recording an actual walk is unchanged.

Required HH:MM estimates determine short names:

- Morning: 07:00 inclusive to 12:00 exclusive.
- Afternoon: 12:00 inclusive to 20:00 exclusive.
- Night: 20:00 inclusive to 07:00 exclusive.

A blank/invalid estimate has no period name. Names update progressively during
entry. A single slot in a period is Morning, Afternoon or Night; repeated slots
are numbered chronologically (09:30 Morning 1, 11:30 Morning 2). Equal estimates
keep stable field order. Midnight slots precede evening slots in the same local
calendar day. Saving sorts estimates. These are approximate routine slots,
not punctuality requirements or changes to recorded GPS history.

Set routine appears without a complete saved routine, including old plans missing
estimates. Its query uses only required_count, routine_enabled and estimated_times;
selecting unapplied solar columns caused the missing entry. Save uses the existing
membership-protected set_walk_routine RPC, without a location argument. UI requires
a valid estimate for every slot before saving. No invented default hours are saved.
Edit routine is disabled until a complete routine is saved, and while the form is
open. Remove routine appears only in edit mode, never initial/incomplete setup.
The Edit tile remains 120px tall on desktop and 104px on narrow screens.

Circles omit hours and the word Walk. Summary appears only for recorded/completed
slots. Walking together retains the actual completed total, with no count chart.

## Migration status

The historical `20261119195302_walk_routine_schedule.sql` remains unapplied and
is retained for ordered migration history. Do not deploy it by itself: it requires
a location the current client intentionally never supplies. The append-only
`20261119203310_fixed_walk_routine_periods.sql` supersedes those requirements,
requires valid times in SQL, sorts estimates and revokes the obsolete location
RPC. It works with or without historical solar columns and preserves saved plans
and activities. It does not remove historical location columns/data if present.

The new migration is proposed, not applied to hosted Supabase. Coordinate review
and ordering with Laura. Current client recovery does not require either new
migration: it uses the already hosted preferences API. Until the new SQL is
applied, required estimates are enforced by the client; earlier hosted SQL still
allows optional estimates. This is distinct from production frontend rollout.

## Verification

263 isolated tests in 59 files passed on Node 22.23.5 with VITE_APP_URL and
both Supabase browser variables blank. Typecheck, production build and whitespace checks passed. Existing Zod annotation
and bundle-size warnings remain. Existing dependencies
were reused rather than installing again. Tests cover fixed boundaries, progressive names, chronological/tied
numbering, invalid estimates, the pre-solar API contract, pending/completed Summary,
legacy incomplete plans, migration compatibility with/without solar columns,
member/outsider/anonymous access and rejection of the obsolete solar RPC.

A temporary browser fixture used real components with local state and a Supabase
stub that rejects access. Desktop 1280px and mobile 390px verified initial setup,
progressive names, save, edit, remove and setup again. Edit stayed 120/104px tall;
there was no horizontal page overflow. No location control or Remove appeared in
setup; no time or pending Summary appeared in circles. Screenshots are fixtures,
not real household saves. No hosted activity or schema write was performed.

## Save-button correction

Save routine stays clickable unless a save is in progress. Native required-field
validation explains missing estimates. Submission reads the actual named form
controls through FormData, then revalidates the count and every HH:MM before the
existing save RPC. Live name previews still use React state, but a delayed time
input event cannot leave Save permanently disabled. This follow-up changes no SQL.

## Routine summary presentation

The routine summary is a viewport-centred native dialog named Walk Summary,
independent of slot period. Title and Close summary are centred. Dog waste and
Notes share bold 15px headings below the 22px dialog title. Read-only summary
counts use the existing waste symbols with accessible text labels, without the
separator. Other recording panels retain their action labels. Summary sits 18px
below the circle row. Saving closes the form without the removed saved sentence.
Edit actions are ordered Save routine, Remove routine, Cancel; setup has no Remove.
A complete routine adds the same #f1f5ec background as Feeding to Start walk.

A removed local browser fixture verified progressive names after each selected
hour, repeated-period numbering, message absence, action order and saved routine
background. The dialog centre matched viewport centre on 1280px and 390px widths;
mobile dialog width was 352px. Symbols, no separator and heading sizes/weights
were checked. Fixture data only; no hosted reads/writes or SQL changes.

Validation on this source: 263 isolated tests in 59 files, TypeScript, production
build and whitespace checks passed on Node 22. Existing Zod annotation/bundle-size
warnings remain. No migration or production deployment was performed here.

## Compact routine and timeline follow-up — 20 November 2026

Routine now occupies one compact card. The small Edit routine button is inside
its upper-right header, disabled until a complete routine is saved and whenever
the routine form is open. Circles are 76px; the example desktop card was 216px
high with summaries, without the separate editing tile. Mobile stays horizontally
contained. Edit actions retain Save routine, Remove routine, Cancel.

Manual-outing explanations are centred. Undo recorded outing and Close summary
share one centred flex row, wrapping only when needed to preserve touch targets.
All waste panels use the existing count symbols by default with accessible labels;
the bottom separator is removed. Recording buttons retain their task labels.

Starting Time and Finishing Time now live inside Start and Finish fieldsets.
Removed the device-time-zone sentence and visible Event text labels. Each event
text input retains a distinct accessible description. Form names and correction
RPC payload are unchanged; a browser fixture submitted 09:25/10:05 successfully
to a local RPC stub with matching start/finish event instants, notes and waste
entries. No GPS samples or actual hosted activities were edited.

A temporary fixture verified setup/save/edit blocking, compact desktop/mobile
cards, aligned manual-summary actions, footer dialogs and timeline layout on
1280px/390px widths. Public sample map tiles loaded with visible attribution
immediately below the map and no MapLibre attribution overlay. These are local
fixtures, not real household persistence or phone background-GPS validation.

## Automatic routine progress and spacing — 20 November 2026

Complete routines now derive slot progress directly from real walks, including
an ongoing walk, using its household-local start day and fixed Morning/Afternoon/
Night period. The earliest unoccupied slot of that period is assigned in real
start order; estimated hours remain approximate. Repeated records are deduplicated
by walk ID. Manual outings retain their slots and are not counted twice. Extra
walks after that period's slots are filled do not incorrectly fill another period.
They remain in real activity totals/history. Deleted walks free their slot and
restored walks are reassigned. Overnight walks belong to their start day, avoiding
a second routine slot on the finish day. Legacy count-only plans retain their
old completed-outing order until configured with valid estimates.

An active slot is filled dark green with an in-progress indicator and no Summary.
Finishing the same saved walk replaces that indicator with completion/summary
without requiring a manual click. No extra daily-check RPC or hosted schema is
needed. Done totals exclude ongoing walks. Existing duplicate-start protection
and private live-GPS rules are unchanged.

Manual summary explanations are two separate centred sentences; buttons are
slightly larger. Set routine and map credits are left-aligned. Live metrics sit
at the lower-right of the map beside the lower-left scale, with mobile sizing to
avoid overlap. Waste/timeline and route-tools/summary gaps are reduced. Deleted
walk headings, notices and Restore are separated; the notice/button gap is 18px.
Removed visible Note text and Walk updated text, keeping an accessible note label.
After timeline save, the detail timeline opens with the returned corrected walk
and refreshed waste events; edits remain separate from raw GPS coordinates.

Verification includes real component fixtures, local start/finish transitions,
period/date-boundary/deduplication/delete/restore tests, and a local correction RPC
stub. The browser showed Left home at 09:25 and Pee by the garden at 09:41 as soon
as Save returned, without reload. Public sample maps loaded with right-hand metrics
beside the scale on 1280px/390px; no mobile page overflow. Fixtures are not live
household data writes or actual phone GPS evidence. No new SQL migration.
