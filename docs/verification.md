# Verification evidence and limits

Updated 23 November 2026. Evidence is specific to the checked commit/environment;
never equate a source file, fixture screenshot or success badge with a real-device
or complete hosted end-to-end result.

## Local checks

Latest behavioural suite for PR #110: **322 tests / 76 files passed** on Node 22,
with browser Supabase configuration blank. TypeScript/build and diff checks passed.
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

Main through merged PR #111: `b5f714674950ba9dce6e45f8ab60ab9c6c81ef4b`.
GitHub Vercel status is success. Public assets at
https://pawshare-laurahenriques05.vercel.app contain centred compact recovery and
same-walk reconnect. The newer dogshift-lmbtah-7143.vercel.app alias redirects to
Vercel login. Owning-team access is still needed for exact READY/alias/source
metadata. Do not present the protected alias as public or redeploy to bypass access.

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
