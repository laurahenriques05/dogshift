# Shared integration safeguards

The old PR #12 branch history is superseded by current main; Git retains its
review chronology. This file preserves the relevant invariants, not pending work.

- Preserve Health dose deep links and the archived Walks Academy redirect.
- Preserve public Google/VAPID configuration examples without copying .env.local.
- Task/Academy attribution tolerates departed/deleted authors without disclosing
  private profiles or granting correction rights to unrelated members.
- Keep deletion guards on household-scoped tables introduced after the original
  deletion migration. Source/hosted timestamp differences require reconciliation.
- Shared calendar adapters use stable IDs; available legacy queue RPCs do not
  authorize notification delivery. Notifications are out of scope.
- Another member's review and production verification remain distinct from an
  agent's code checks. Follow collaboration.md and owner feature documents.
