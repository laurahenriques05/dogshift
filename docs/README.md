# Documentation status

This directory contains both current references and historical rollout notes. Read this page first when reviewing the repository for the demo or submission.

## Current references

- [README](../README.md) — product scope, current architecture, verification commands and release notes.
- [Walks team sync](carol-walks-team-sync.md) — current Walks state and remaining rollout checks.
- [Health/account](remaining-health-account.md) — current Health and account behaviour and hosted-service limits.
- [Tasks/Academy proposal](tasks-calendar-academy-proposal.md) — shared Tasks, Calendar and Academy contracts.
- [Verification](verification.md) — measured checks and known limitations.
- [Collaboration guide](collaboration.md) — review, migration and release procedure.

## How to read older handoffs

Some feature handoffs preserve earlier implementation stages so the team can explain decisions. A sentence containing **pending**, **unapplied**, **requires review**, or **not deployed** may describe the state at the time that document was written, not the current main branch or hosted project.

Before the demo or submission:

1. Start with the current README and the current feature sync above.
2. Check the referenced migration or deployment status before making any change.
3. Never rerun a migration only because an older handoff calls it pending.
4. Treat a historical note as superseded when a newer current reference or merged PR contradicts it.

The repository keeps these notes for traceability; they are not a second source of truth.
