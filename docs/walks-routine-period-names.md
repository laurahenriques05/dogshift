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
