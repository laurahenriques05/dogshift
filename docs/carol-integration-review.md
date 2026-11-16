# Carol — Walks integration review (14 November 2026)

Source reviewed: Maria's `feature/tasks-calendar-academy-maria` at
`fbfd4b7f55b46fd0994e3ca6787e62c72bfe3610`, against main at
`67734b2ba93d75521f2fc805a212631a9f8dbafd`.
This is a technical review prepared for Carol, not another group member's PR
approval, permission to merge, or evidence of hosted migration application.

## Academy decision

**Scope update (15 November 2026):** the user clarified that Academy should have
one clear purpose: progressive dog-trick training. The earlier choice to expose
`walking-basics` as an Academy lesson is superseded. `/walks/learn` now returns
to Walks, while the old module IDs/history stay preserved internally.

The detailed walkthrough below records the earlier integration review and is
retained as history; follow the scope update above for the current behavior.

## Walk alerts decision

Retain the current recorder's in-app stationary warning and optional browser
notification. Do not connect it to server push in this integration. The adapter
in `src/features/walks/notifications.ts` is synchronous and exposes show/cancel;
there is no registered shared implementation in the reviewed tree. A shared RPC
being available does not mean Walks calls it.

The warning belongs to the walker only. Do not notify the entire household or
send coordinates. Keep walking, ending, leaving the recording view and GPS
interruption must clear the relevant local warning/notification. Stationarity
requires fresh GPS: background delivery must not make a stale timer end a walk.
Any future push bridge needs an agreed asynchronous cancellation/retry design,
stable warning-episode identity and real-device validation before enabling it.

## Calendar scope

Maria's calendar currently accepts task, Feeding and Health sources; it does not
query walks. This matches the agreed initial calendar filters. A planned walk can
be a family task; a completed GPS walk remains in Walks history. No Walks calendar
source, second reminder system or new schema is needed for this review. Future
walk events require an explicit contract with Maria before implementation.

## Coordination and limits

The fetched Maria branch already contains the merge of PR #11, so the screenshot's
instruction to integrate that PR is historical for that branch. This review does
not merge Maria into main, apply either new migration, refresh hosted schema
cache, deploy anything or confirm Beni's Health source IDs/routes. Laura retains
migration coordination; Beni's confirmation remains separate. Mobile push and
background/iPhone GPS are not validated by these local checks.

Validation: an isolated archive of the exact Maria SHA above passed 19 tests in
`tasks-academy`, `walks-gps` and `walks-security`, plus `npm run typecheck` and
`npm run build`. Existing node_modules were reused; this was not a fresh npm ci.
Node 26.13.0 was used (project/CI target: Node 22). Build reported Zod annotation
and bundle-size warnings. These are local unit/PGlite and compile checks, not a
browser redirect test, full-suite run, hosted migration test or device test.

Fix validation: on `codex/carol-academy-redirect`, the full suite passed (130 tests
in 27 files), as did typecheck, build and diff whitespace checks. Build warnings
remain as above. No browser/device or hosted write validation was performed.
