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

`codex/walks-history-and-explicit-progress` is based on main `113aa25` (#77/#78
merged). NFC copy is left-aligned again. Start walk now counts completed routine
circles, including manual checks; an active start is not a completion. Walks and
Maria’s calendar use the same explicit completion predicate: a real finished walk
or a non-deleted manual check. Estimated times never complete either view.

The reported Deleted error was reproduced with the missing hosted RPC. Saved
history remains accessible through View saved walks, while available own-deleted
rows remain visible; family Deleted setup is explicitly pending. The user confirmed
that Laura/Maria’s migration review is still outstanding. No hosted migration or
real deletion was performed, and family-wide removal is not yet live.

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
- History uses real saved walks only; Demo walks has been removed from the UI.
  Saved cards retain their existing titles; area-names controls/lookups are removed.
- Open-map credits only in the small persistent footer, including active imagery
  sources; preserve Google native attribution. No style picker on a saved empty
  route. Do not hide map data/permission errors or claim fake accuracy.
- Set up collar tag opens/focuses/scrolls to the final NFC disclosure. It copies
  Feeding's section, including browser writer/fallback; 12px notice/action gap,
  normal-weight description. The tag opens setup, not unattended recording.

## Genuine pending work

1. **Family deletion rollout:** read-only inspection on 21 November confirms
   hosted set_walk_deleted still requires the author and permanently_delete_walk
   is absent. New `20261121102419_family_walk_removal.sql` is the single proposed
   hosted rollout; it includes both removal RPCs, the metadata-only Deleted list
   and a schema-cache notification. It supersedes the two earlier uninstalled
   deletion proposals for this hosted project; do not apply/reapply them as a
   workaround. Review with Laura and Maria before application, especially existing
   task-link cleanup. Current members only, completed walks only; outsiders,
   anonymous and former members are rejected. No real care records were deleted.
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

Current follow-up suite: 308 isolated tests/70 files passed on Node 22.23.5 with
browser configuration blank; TypeScript/build and Markdown links also passed.
See verification.md for current checks
and evidence limits. Existing Zod annotation/bundle advisories remain.
Fixtures checked narrow 360/390px and desktop layouts, grouping/slot identity,
summary/timeline UI, consent and NFC disclosure/copy feedback. Fixture evidence
is not hosted persistence, physical GPS or physical tag validation.
