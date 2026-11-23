# Walks — current state

Updated 23 November 2026. Read AGENTS.md and README.md first, then this file.
This is the existing current-state register, not a chat diary. No duplicate
handoff is needed. Consult technical documents only for the current task.

## Source and release

Main through PR #111 is `b5f714674950ba9dce6e45f8ab60ab9c6c81ef4b`.
PR #109 records installed retention, recovery messages and the shorter README;
#110 implements offline-stop/same-walk reconnect and removes popup paragraphs;
#111 centres the connection alert. All are merged. The last UI request is done,
not waiting for reimplementation. Earlier approved screenshot adjustments are also
integrated; neither rejected Walks template was added.

GitHub reports Vercel success for #111. The public app at
https://pawshare-laurahenriques05.vercel.app contains its compact centred alert
CSS and reconnect code. The newer dogshift-lmbtah-7143.vercel.app alias redirects
to Vercel login. Do not use that alias as a public demo/tag address without owning-
team verification. Exact READY/alias/commit metadata still requires team access;
public assets and success status are narrower evidence. See collaboration.md.

## Approved behaviour

- Compact mobile-first green/cream UI following Feeding; preserve the colleagues'
  features and desktop layout when a request is mobile-only.
- Optional routine with required Estimated hours, no location/solar naming.
  Morning 07–12, Afternoon 12–20, Night 20–07, end-exclusive. Stable insertion
  order/slot IDs; never sort saved hours and renumber manual checks.
- Set routine left of Edit; edit/remove actions remain inside the routine flow.
  Mobile hours are full-width per row; statistics period control is top right.
- Today's walk remains the approved existing composition. Circles use short
  names, hero uses Morning Walk/Afternoon Walk 1/Night Walk. Completed counter
  equals completed circles, including explicit manual checks; active/estimated
  walks never count as completed. Calendar uses actual starts/checks, not time passing.
- Walking together and Last Adventure sit below routine; statistics default open.
  Last Adventure uses member-name `'s Walk` titles and the top-left icon/date/title
  row; History is a text action. Empty state is honest, with no invented activity.
- Past Adventures shows real completed walks from the last 168 hours. No Demo,
  Deleted/Not deleted selector, restore actions or removal crosses. Area-name
  consent/automatic lookups remain removed. No-GPS copy: No GPS route recorded.
- Start explicitly chooses GPS/time-only and waste mode. The recorder sees only
  the active walk, controls and errors. Ongoing GPS/notes remain recorder-private.
  Current members see the saved route; only the recorder corrects notes/events.
- Pause freezes elapsed time/GPS; resume makes a new segment. Detected internet
  loss stops GPS, preserving the same walk and prior saved/pending points. Online
  alone does not resume. Reconnect verifies the server, flushes pending points and
  resumes the same walk in a fresh segment; no invented gap or duplicate start.
  Manual pause and pending finish are respected. Connection popup is centred and
  has only a heading/Reconnect, without explanatory paragraphs.
- Fresh continuous GPS stationary for two minutes opens the centred adventure
  question. Yes continues; No finishes; five further unanswered minutes finishes.
  GPS gaps are not evidence of stationarity. Device/background reliability is unverified.
- Set up collar tag opens the final Feeding-style NFC disclosure. Tag URL is
  `<VITE_APP_URL>/walks?action=start&household=<UUID>`; `/walks` alone opens no popup.
  After auth/membership, Confirm walk shows the next named outing and Estimated
  hour. Confirm opens existing GPS/waste setup; Change details opens routine editing.
  Opening a URL never records a walk. Android browser writing is conditional;
  iPhone uses an external one-time writer. No physical-tag result is claimed.

## Installed seven-day deletion

Carol confirmed Maria/Laura approval before installation on shared Supabase
`jqxeszipztucnqcywkab` on 23 November.

| Source | Installed hosted version/name |
| --- | --- |
| 20261122215728_walk_seven_day_retention.sql | 20261123142032_walk_seven_day_retention |
| 20261123142121_enable_walk_retention_schedule.sql | 20261123142146_enable_walk_retention_schedule |

The postgres-owned `pawshare-walk-seven-day-retention` job runs every minute,
up to 1000 expired completed walks per run, regardless of author/soft deletion.
Active walks are preserved. GPS, notes and waste cascade away; minimal private
Task-completion receipts preserve real completed responsibilities. Initial live
check: seven expired walks removed; 37 recent walks and one completed Task stayed;
no orphan route/note/waste rows. No active walks existed in that live check;
local SQL separately tests active preservation. Latest read-only check: active
job, 32 successful runs, zero failures. This is database/app deletion, not provider
backup erasure. Do not rerun these migrations or superseded deletion proposals.

## Native iOS source

Carol authorized an installed iOS shell for background GPS. Feature-branch source
uses Core Location and a durable private queue while reusing the current UI/RPCs.
See ios-walks.md for build, permissions and acceptance. It is not installed or
verified on a physical iPhone; the public Safari app remains browser-based.
No migration, Auth setting or tag URL was changed.

## Real remaining work

1. Physical Android/iPhone NFC, outdoor GPS, denied permission, pause/resume,
   stationary 2+5, offline/reload/reconnect, app switching and screen lock acceptance.
2. Disposable multi-user live smoke tests across Family/Feeding/Tasks/Walks and
   cross-household rejection. Carol agreed to sign in test accounts, but the opened
   browser was still her real Nova household. No test care records were written there.
3. Routine SQL hardening: read-only 23 November definition still accepts partial/
   blank hours, while client requires every hour and server preserves input order.
   Review one reconciled strict-hours/stable-ID change before any installation;
   never install the superseded solar/sorting proposals blindly.
4. Exact production metadata/public alias reconciliation with the owning Vercel team.
   Do not change permissions or initiate another release without a concrete reason.

Notifications will not be implemented. Account/family deletion endpoints are
absent from hosted Edge Functions; Beni owns that separate deployment/cleanup
work. Neither is implicit authorization to deploy services during Walks work.
See verification.md for test evidence and walks.md for technical mapping.
