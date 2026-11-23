# Verification evidence and limits

Updated 23 November 2026. Evidence is specific to the checked commit/environment;
never equate a source file, fixture screenshot or success badge with a real-device
or complete hosted end-to-end result.

## Local checks

Latest check: **322 tests / 76 files passed** on an isolated snapshot of main
`a97a794cddf7349f0684bc40fa7e5447e3c874fd`, using Node 22.23.5 with browser
Supabase configuration blank. TypeScript/build passed; no hosted writes were made.
PR #111 changed only CSS; TypeScript/build and mobile/desktop centring passed.
Tests cover accepted/rejected permissions, invalid input, stock, idempotency,
Tasks/calendar, queues, GPS segments and stationary 2+5-minute logic.

`npm test` uses one worker to avoid resource contention between PGlite databases;
no assertions or per-test timeouts were relaxed. PGlite fixtures omit only the
hosted pg_cron setup migration, retaining retention/domain SQL. Prior fresh npm ci
on Node 22 reported zero known vulnerabilities; that is a dated observation, not
a permanent supply-chain guarantee. Zod annotation/large-bundle advisories remain.

Actual WalkProvider browser fixture with mocked backend/GPS/connection verified:
no points during an outage; online alone does not resume; Reconnect keeps the
same walk ID, saves pending pre-outage points and starts a fresh segment. Two
outages/repeated retries produced one start and four unique saved points.
The compact popup has no explanatory paragraphs. CSS fixture measured centre
offset (0,0) at 390×844 and 1440×900. These are simulated, not physical-phone checks.

## Hosted checks

- Supabase project `jqxeszipztucnqcywkab`: all public tables have RLS enabled;
  dog-photos and health-documents buckets are private. Inspected policies require
  active household membership. This does not replace two-account live rejection tests.
- Retention and pg_cron are installed once with confirmed Maria/Laura approval.
  Exact source/hosted mapping: carol-walks-team-sync.md. First run removed seven
  expired walks, preserving 37 recent walks and one completed Task; no orphan
  GPS/notes/waste. No active walks existed then; local SQL tests active preservation.
  Latest job check: enabled, once/minute, 32 successful runs and zero failures.
- Task category columns, Health/Other constraints, inheritance trigger and
  save_categorized_household_task definition were independently inspected.
  Manual SQL is not in the ledger; never reapply because a filename is absent.
- log_medication_dose definition independently matches the current rule: today/
  past scheduled days may be Given, future days rejected, actual time not future;
  membership/recorder protection remains. Authenticated round-trip still untested.
- Edge Functions list is empty: account/family deletion source/UI is not a
  working deployed endpoint. Health document deletion uses Storage separately;
  actual upload/delete/cleanup acceptance is still pending.
- Security advisors: no ERROR-level notices in the checked response. Expected
  private receipt RLS/no-policy info, authenticated definer-RPC and anonymous-
  sign-in policy warnings need contextual review, not blind grant/policy changes.
  Leaked-password protection is disabled; see
  [Supabase password guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  No Auth/access configuration was changed.

## Release evidence

PR #112 is merged; checked main is `a97a794cddf7349f0684bc40fa7e5447e3c874fd`
(subsequent Feeding mobile CSS adjustment). GitHub Vercel status is success.
Public CSS is byte-identical to that main snapshot's build. Public assets at
https://pawshare-laurahenriques05.vercel.app contain centred compact recovery and
same-walk reconnect. The newer dogshift-lmbtah-7143.vercel.app alias redirects to
Vercel login. Owning-team access is still needed for exact READY/alias/source
metadata. Do not present the protected alias as public or redeploy to bypass access.

## Authentication and acceptance readiness

Read-only Auth logs on 23 November show confirmation-send events at 15:04 and
15:07 UTC, followed by HTTP 429 `over_email_send_rate_limit` at 15:14. A send log
does not establish mailbox delivery or identify a particular user's attempt.
The public bundle targets the expected team Supabase project. No signup/recovery
request, account confirmation, SMTP setting or Auth permission was changed.

Carol authorized her former test family for live records; read-only inspection
found it inactive with zero memberships. Recovery RPCs are installed, but restoring
it needs its owner's authenticated product flow. Do not grant membership by SQL,
leave Nova for testing, or assume localhost uses an isolated backend.

## Live demo rehearsal

Prepared order and proposed speakers; not yet rehearsed on the deployed app.
Use authorized demo accounts/data, with one owner, another member and a separate
household account. Carol operates; each feature owner explains their part.

| Order | Speaker | Demonstration and check |
| --- | --- | --- |
| 1 | Carol | Public URL, sign-in, correct demo family; explain one dog per household. |
| 2 | Laura | Save a mixed-food meal once; second member reloads and sees the same meal/stock. Reject an invalid amount; retry without duplicate deduction. |
| 3 | Maria | Assign a Task and show its calendar source; confirm actual care, reload in the other account and check completion. Opening the source must record nothing. |
| 4 | Carol | Start a time-only walk, pause/resume, finish and reload history. Other member sees the completed activity but cannot correct Carol's entry. NFC URL requires confirmation. |
| 5 | Beni | Save an authorized Health record and reopen its calendar source; demonstrate private-file access with demo files only. Explain that deletion endpoints were absent at the last hosted check. |
| 6 | Maria | Open an Academy lesson and show saved progress in the demo account. |
| 7 | All | Separate-household account sees no demo-family data; explain offline/map fallback, test coverage and physical-device limits. |

Rehearse on the public URL with two devices and record actual accepted/rejected
results before claiming success. Prepare real authorized starting data; do not
invent history or reset the shared database. Keep secrets/dashboards off the
projector. Phone GPS/NFC checks are separate in walks-gps-testing.md.

## Still unverified

Disposable-account sign-in/registration/email recovery/invitations; two-member
Feeding stock/save/reload and Tasks completion/assignment; another-household
rejection; private file upload/delete/cleanup and account/family deletion rollout;
physical NFC, outdoor GPS, denied permission, offline/reload/reconnect, stationary
prompt, app switching and screen lock on Android/iPhone. Use designated disposable
accounts/data only. Carol can sign them in; no passwords/tokens should enter chat,
logs, docs or screenshots. Notifications are out of scope, not an acceptance task.

No complete live smoke test was performed in Carol's existing Nova household.
Use walks-gps-testing.md for phone checks and collaboration.md for release rules.
