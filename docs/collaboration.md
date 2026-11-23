# Team collaboration and releases

## Workflow

1. Read AGENTS.md/README/current feature state, inspect status and fetch current
   main. One agent per checkout; never discard local or teammate work.
2. Start a focused codex/ branch. Agree shared schema/routes/styles/types with
   Laura and affected owners. Feature owners author their versioned migrations.
3. Implement a reviewable slice; run appropriate isolated tests, TypeScript/build
   and narrow/desktop checks. Separate sample fixtures from hosted/device evidence.
4. Commit/push and open a PR with concrete scope, validation and limitations.
5. Another member reviews; an agent cannot supply that member's approval. Resolve
   feedback and require passing Verify. Do not merge/deploy merely because tests pass.
6. Merge after approval; publish the exact main commit through the Git integration.
   Confirm project, commit, READY state and production alias. Never force-push.

When command-line GitHub authentication is unavailable, connected GitHub tree/
commit/ref tools can publish the tested tree. Use expected-head leases, preserve
parents and verify remote tree equality; do not claim a failed push succeeded.
Do not send team messages unless explicitly asked.

## Project and latest evidence

Repository: laurahenriques05/dogshift (renamed from pawshare; local checkout path
remains pawshare). Public app verified 23 November:
https://pawshare-laurahenriques05.vercel.app. The newer
https://dogshift-lmbtah-7143.vercel.app redirects unauthenticated visitors to
Vercel login; do not call it the public demo/tag URL until verified by the team.
No protection or domain settings were changed.

Vercel project dogshift, prj_4tp8vt9Qb3J8KgFWI9Vn5qxVEpL5, team lmbtah-7143.
Main through PR #111 is b5f714674950ba9dce6e45f8ab60ab9c6c81ef4b; GitHub Vercel
status is success. The public app assets include the centred compact connection
alert and same-walk reconnect code. Exact READY/alias/commit metadata still needs
owning-team access: the connected Vercel account lacks that team's grant. This is
not evidence of a failed current build. Do not broaden permissions or republish
merely to bypass that access limitation.

## Hosted migrations

Reconcile actual ledger AND definitions before applying anything: some source and
hosted timestamps differ, and manual SQL can be absent from the ledger. Never
blindly db push/reset, edit applied migrations or repeat teammates' installations.
Review combined behaviour/dependencies, not only conflict-free SQL text. Applying
an RPC can affect live permissions/data; needs task-specific authorization and
coordination, not inferred permission from a read-only inspection.

Walks' checked mapping and pending proposals are in walks.md/team sync. Health's
reported manual SQL and Edge Function prerequisites remain in its owner docs.
Tasks reliability/quick assignment are installed as of the 20 November ledger
check. Presence of a source file is never installation/delivery evidence.

## Review checklist

- Fulfil the approved request, without superseded templates/features or fake data.
- Enforce membership/ownership/validation on the server, including rejected cases.
- Preserve tests, private Storage, secrets and unrelated feature owners' work.
- Verify compact mobile, keyboard, focus, error/empty/loading and retry behaviour.
- Describe source, hosted contracts, device validation and deployment separately.
- Keep README/current feature docs concise; replace stale claims rather than
  appending another chronological diary. Git is the historical record.
