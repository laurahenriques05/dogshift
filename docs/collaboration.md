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

Repository: laurahenriques05/pawshare. Production app:
https://pawshare-laurahenriques05.vercel.app. Vercel project pawshare,
prj_4tp8vt9Qb3J8KgFWI9Vn5qxVEpL5, team slug lmbtah-7143.
Preferred production branch is main. Do not change settings to bypass access.

On 20 November, main includes PR #68 at
72016adb6ea353f6daca5006698d34ebe8ec36a2; its GitHub Vercel status reports success.
Connected Vercel access last returned 403 for that team, so exact current alias/
READY/source linkage was not independently reverified. This is distinct from a
failed build or proof of an outdated public app. Inspect the owning project when
access is available; no manual deployment or permission change is implied.

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
