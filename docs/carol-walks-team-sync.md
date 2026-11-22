# Walks — current state and next work

Updated 21 November 2026. This is the existing current-state register, not a chat
transcript. Read AGENTS.md, README.md and this file first. Detailed behaviour is
in walks.md and the focused documents linked there. Git retains old decisions;
do not resurrect superseded requirements from old commits or chat previews.

## Confirmed repository state

Main includes these merged PRs:

| PR | Scope | Merge commit |
| --- | --- | --- |
| #65 | Grouped estimates, stable routine slots, mobile layout, footer-only credits, consent-based area names |  e4b7d392732abe3bba869afb5d407c9dac3d802e |
| #66 | Remove approximate-location warning; family-history deletion UI and proposed RPC migration | 856fab93157cd30ab475022e5f5b0b426ead6afc |
| #67 | Feeding-style walking NFC section at page end; collar button opens/scrolls to it | a898ecad69b8d9ebfef126fed10cbf7024e89623 |
| #68 | NFC spacing/normal description weight, full hero names, no map-style picker without GPS | 72016adb6ea353f6daca5006698d34ebe8ec36a2 |

These statuses were read from GitHub. #68 is merged, not an outstanding UI task.
Its Vercel commit status is success (deployment 3Zc1PJBeExETi67Jeqk1JGZCLMoM).
The Vercel connector last refused team access; a successful GitHub status alone
is not independent verification of the exact production alias/READY metadata.
Recheck current main and production before making a new release claim.

## Current follow-up branch

`codex/walks-seven-day-retention` replaces manual history deletion with a rolling
seven-day history, measured from completion (168 hours). Titles use the saved
member display name followed by `'s Walk`; unavailable names use an honest generic
fallback. Deleted/Not deleted filters and removal/restoration controls are removed
from the history and summary UI. Demo walks remain removed.

The UI change is distinct from physical deletion. Proposed migration
`20261122215728_walk_seven_day_retention.sql` purges completed walks older than
168 hours, including previously deleted walks, in batches of 1000 once per minute
when pg_cron is installed. No initial purge runs during migration installation.
Task completion is preserved via private, minimal occurrence receipts; walk GPS,
notes and waste are not archived. This shared Tasks contract requires Maria/Laura
review. The migration/job are NOT installed or verified on the hosted project:
read-only inspection was blocked by automatic approval review's usage limit.
Never reapply the earlier deletion proposals to implement this new policy.

## Approved behaviour to preserve

- Compact, intuitive mobile-first green/cream design, following Feeding. Reduce
  unnecessary scrolling; do not add either rejected styling template (compact
  dashboard or task tabs). A carousel selection did not override that rejection.
- Routine is optional. Walking routine/Set routine without a complete plan;
  Today's walk after save. Edit disabled until complete and during the form.
  Remove only in edit mode, between Save routine and Cancel. No opt-out button.
- Every slot requires Estimated hours. Fixed periods: Morning 07:00–12:00,
  Afternoon 12:00–20:00, Night 20:00–07:00, end-exclusive. No sunrise, sunset or
  location in routine setup. Hours are estimates, not exact walking obligations.
- Progressive names only after an hour is entered. Group periods immediately;
  numbers only for repeats, in stable planning/insertion order. New 15:00 added
  after an existing 17:00 is Afternoon 2, displayed after Afternoon 1. Preserve
  saved slot indexes/manual check identities; never sort the submitted array.
- Circles are 96px, short names (Afternoon 1), no estimated clock times. Hero
  names include Walk (Afternoon Walk 1). Real starts fill matching-period slots
  automatically; in-progress is not completed and has no Summary.
- Walk Summary is centred; actual notes/waste symbols, truthful manual-outing
  explanation, aligned Undo/Close. Empty diary counts 0; no false last start.
- Walking together retains completed total. Charts offer distance/time only.
- Mobile only (up to 600px): estimated-hour inputs use one full-width field per row;
  the summary period selector sits at the top right, above the full-width title.
- Pause freezes elapsed time and GPS; resume creates a segment. Notes/events can
  be corrected by their author, preserving all raw GPS. Save updates timeline.
- History uses real saved walks from the last 168 hours only; no Demo or Deleted view.
  Saved cards retain their existing titles; area-names controls/lookups are removed.
- Open-map credits only in the small persistent footer, including active imagery
  sources; preserve Google native attribution. No style picker on a saved empty
  route. Do not hide map data/permission errors or claim fake accuracy.
- Set up collar tag opens/focuses/scrolls to the final NFC disclosure. It copies
  Feeding's section, including browser writer/fallback; 12px notice/action gap,
  normal-weight description. The tag opens setup, not unattended recording.

## Genuine pending work

1. **Seven-day retention rollout:** review the new migration and task-completion
   receipts with Maria/Laura, inspect hosted definitions/ledger and pg_cron, then
   install only the reviewed migration and verify the named job. Until then the
   UI hides expired walks but physical deletion is not active. Earlier family
   deletion proposals are superseded for this product flow, not newly authorized
   installations. No real care records were deleted in this work.
2. **Routine SQL hardening:** client requires all hours; hosted RPC still allows
   blank/partial estimates and preserves input order. The fixed-hours and stable-
   identity proposals remain unapplied. Review the final combined result before
   rollout; never apply the old solar proposal by itself or sorting that renumbers
   manual records. Current client already works with the existing preferences RPC.
3. **Real-device acceptance:** NFC writing/tapping/sign-in, foreground GPS,
   permission denial, offline/reload, pause/resume and stationary 2+5 minute
   behaviour on Android/iPhone. Background/screen-locked reliability is unverified.
4. Immediate NFC start after authentication/membership/location consent remains
   requested but unimplemented: current flow still asks settings/confirmation.
   Agree the consent experience before changing it. No Walks server push/calendar
   producer is implemented; future contracts belong with Maria.
5. Exact production alias/commit verification needs appropriate Vercel access.

No missing task should be inferred solely from an old screenshot. Ask about a
new discrepancy only after checking current code, hosted contracts and release.

## Hosted evidence and validation

Hosted migration ledger and function definitions were inspected read-only on
20 November; no data/schema mutation was performed. See walks.md for the exact
source/hosted version mapping. Journal/routine preferences, waste/tracking,
deleted-owner preview, pause duration and timeline corrections are installed.

Current follow-up suite: 315 isolated tests/73 files passed on Node 22.23.5 with
browser configuration blank; TypeScript/build and Markdown links also passed.
See verification.md for current checks
and evidence limits. Existing Zod annotation/bundle advisories remain.
Fixtures checked narrow 360/390px and desktop layouts, grouping/slot identity,
summary/timeline UI, consent and NFC disclosure/copy feedback. Fixture evidence
is not hosted persistence, physical GPS or physical tag validation.
