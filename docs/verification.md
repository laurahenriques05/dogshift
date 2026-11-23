# Verification evidence and limits

Reconciled 23 November 2026. Test counts are observations, not permanent guarantees.
Use Node 22.x >=22.12; npm test, npm run typecheck, npm run build and git diff
--check. Tests must not call the hosted database or send real emails/push.

## Hosted retention and recovery — 23 November

Carol confirmed Maria/Laura approval. Retention migration installed as
`20261123142032_walk_seven_day_retention`; scheduling as
`20261123142146_enable_walk_retention_schedule` (source filenames are recorded
in carol-walks-team-sync.md). pg_cron is enabled and the postgres-owned job runs
once per minute. First scheduled run succeeded: expired walk count 7 → 0;
recent walks stayed 37, completed Tasks stayed 1, and orphan GPS/notes/waste were
zero. No active walks existed during this live check; isolated SQL tests cover
active preservation and minimal completion receipts. No old migrations reran.
Notifications remain out of scope; no sender was deployed/enabled.
Recovery follow-up: 322 isolated tests/76 files, Node 22 TypeScript/build and
diff checks passed. PGlite fixtures omit only pg_cron setup, retaining domain
and retention SQL/assertions. Actual WalkProvider browser fixture (mocked services,
GPS and connection) verified offline stops point collection; online alone does
not resume; Reconnect retains the same walk ID, flushes a prior pending point and
resumes with segment_start. Repeated retries kept one start and four unique
saved points across two outages. The compact dialog has no explanatory paragraphs
and no mobile overflow. These are simulated checks, not physical GPS/device proof.

## Node 22 reliability check — 23 November 2026

Base main: `6bb4c33018522e2778108aaa68782420dcabbf40`.
A clean exported checkout used Node 22.23.5 (official darwin-x64 binary, SHA-256
verified) and fresh `npm ci`: 145 packages installed, audit reported zero known
vulnerabilities. No .env.local was copied; SQL tests used temporary PGlite only.

Default parallel `npm test` reproduced the Health/calendar timeout on this
computer even under Node 22. Node version alone does not explain the earlier
failure. Running the complete unchanged suite with `--maxWorkers=1` passed
**322 tests in 76 files** in 191.47 seconds. This supports resource contention
between concurrent database fixtures as a contributor; it is not a CPU/memory
profile or proof of the sole cause. A separate repeat of the two previously
failing files passed all five tests in 17.27 seconds. Node 22 TypeScript and
production build also passed; existing Zod/bundle-size advisories remain.

`npm test` now sets `vitest run --maxWorkers=1`, so local use and GitHub's existing
`npm test` step share the bounded worker setting. No assertions, tests, isolation
or per-test timeouts were removed or relaxed. Each file retains its isolated
worker; files execute sequentially. This is test infrastructure only, not a change
to application concurrency or shared-database behaviour.

## Historical checks — 21 November Walks progress/history fallback

On `codex/walks-history-and-explicit-progress` (base main `113aa25`), all
**308 isolated tests in 70 files**
passed on Node 22.23.5 with both Supabase browser values blank.
TypeScript, production build and git diff --check also passed. Changed Markdown file links were checked.
Existing node_modules were reused; this is not a fresh npm ci. The care-task
fixture now picks a future time within the current UTC day: the former +1 hour
failed after 23:00 because starting a future-day walk is correctly forbidden.
Assertions and production task rules are unchanged.

Existing Zod annotation and large-bundle advisories remain; they are not failed
checks. PGlite/minimal Auth/Storage roles cover isolation, rejected writes, retries,
stock, routines, GPS/timeline and deletion. This is not a hosted security audit.

Real-component fixtures reproduced missing get_deleted_walk_history/PGRST202,
then opened Not deleted through View saved walks. Own-deleted fallback remains
separate from unavailable family history. A second fixture showed two completed
circles (one recorded walk, one manual check) and a matching 2-of-3 counter, plus
left-aligned NFC copy without horizontal overflow at 360px. Regression coverage
compares counter, circles and calendar before/after real completion, manual checks,
active starts, deletion/undo and elapsed routine hours. Inactivity preview Yes/No
was inspected separately; no real walk/tag or hosted data was changed.
These checks are not physical tags, live account persistence or actual GPS.

## Read-only hosted evidence — 20 November

Migration ledger confirms installed Walks core/waste/tracking/deleted-owner-preview,
journal/preferences, pause/duration and correction capabilities; exact mapping is
in walks.md. Tasks reliability/quick assignment and Tasks/Push/Academy schema are
also recorded. Manual Health SQL may not be represented in that ledger.

Function inspection confirms hosted set_walk_deleted remains author-only and
set_walk_routine preserves order but permits optional/partial estimates. Proposed
family-deletion and strict-hour/stable-ID follow-ups were not verified installed at that time. These observations are historical, not proof of current absence. A read-only
21 November function check confirms author-only soft deletion and no permanent
RPC; no live write was used to test this. No hosted care
records or schema were changed by this follow-up.

## Current release evidence — 23 November

- Main f12293a: GitHub Verify passed on Node 22, and Vercel reported deployment
  success. An exported copy passed TypeScript/build locally on Node 26.13 with
  reused dependencies. npm audit reported zero known vulnerabilities at that time.
- A local Node 26 full-suite attempt recorded failures in tasks-experience and
  care-calendar-integration, including a 30-second timeout; the slow run was
  stopped before completion. Do not describe it as a full local pass. Matching
  Node 22 CI passed; the cause of local failures was not established.
- Medication follow-up df7bc10: eight focused tests passed, including temporary SQL
  checks, plus TypeScript/build. Vercel reported success and the public bundle
  contained the updated future-dose rule. No hosted medication records were changed.
- Category migration: owner reported SQL Editor Success on 22 November. Independent
  function/ledger inspection and two-member round-trip remain unverified; see
  calendar-topics.md. Anonymous REST reads on 23 November returned permission
  denied; no grants were changed.
- Public-site responses and deployment statuses are evidence of availability and
  release signals, not an authenticated end-to-end audit of every workflow.


## Still requires explicit integration/device evidence

- Hosted auth/email/recovery, every invitation/onboarding/departure/deletion path.
- Disposable multi-account writes and forbidden actions on the exact deployed UI.
- Android/iPhone physical NFC write/tap/sign-in and permission/duplicate behaviour.
- Outdoor GPS, pause/resume, stationary 2+5, lost signal, offline/reload/reconnect,
  screen lock and app switching. Follow walks-gps-testing.md; no background promise.
- Google key/billing/domain/runtime paths and external provider availability.
- Push sender secrets/deployment/cron, recurring materialization and iOS/Android
  delivery; database queue/schema and calendar links do not establish delivery.
- Health Storage cleanup and Auth deletion/session expiry/retry under reviewed
  server environment, without weakening Auth/RLS or deleting real user accounts.

Use designated disposable data only; record exact commit/device/environment and
observed outcomes. Keep read-only schema, fixtures, rolled-back SQL, actual writes
and physical-phone results distinct. Do not fabricate green checks for missing
observations. Release procedure is in collaboration.md.
