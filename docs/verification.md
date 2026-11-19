# Verification — 11 November 2026

## Current checks

On feature/laura-feeding, after the Feeding visual polish and team-documentation update:

- `npm test`: passed **93 tests across 11 files**.
- `npm run build`: passed TypeScript project checks and Vite production bundling.
- Build warnings: third-party Zod annotation comments are stripped by Rollup; the main JavaScript chunk exceeds the advisory 500 kB threshold. Neither warning fails the build.
- `git diff --check`: checked as part of documentation finalisation.
- The automated suite uses isolated PGlite PostgreSQL, minimal Auth/Storage schemas and authenticated/anonymous roles. It does not mutate the shared hosted database.

## What the tests cover

Validation/configuration, invitation routing and authorization, household isolation and owner/member restrictions, dog-photo transformations/storage policies, food-stock calculations, routine validation, mixed-food atomic writes, meal outcomes, creator-only corrections, forbidden writes and idempotent retries. Read src/test for the exact cases; passing these tests is not a complete hosted-system security audit.

## Prior verification evidence

- The Feeding UI and saved routine/checklist were inspected with labelled sample-data component previews at desktop and 390px mobile widths. Edit/cancel behaviour and mobile overflow were checked. These screenshots are not live authenticated account data.
- A prior authorized hosted Feeding transaction checked purchases, retry protection, stock deductions, duplicate warnings, corrections/removal and outsider isolation; test data was rolled back. See feeding-handoff.md.
- Latest published application source before this documentation-only update: `c6449b205f878ce13fd8bc5a271cfba19526dcfa`, Vercel deployment `dpl_Cj3oFD5A1A51HeB7NWtxtxbdPmne`, READY. Its production URL returned successfully and its served bundle contained the Feeding refresh markers.

## Not established by these checks

- End-to-end hosted registration, email/SMTP delivery, password recovery and every onboarding/invitation path on the current release.
- Physical NFC tags, actual iPhone/Android behaviour, or recovery of quick-action intent across sign-in.
- Phone push, background GPS and persistent calendar delivery; these integrations are not implemented by Feeding.
- Automatic cross-device Feeding updates; current data refresh is manual/window focus.
- Fresh-machine installation, the separate Supabase pgTAP suite, and a full secrets-history scan.
- That GitHub main and production are aligned. The previous deployment record above is a historical snapshot; verify the production deployment SHA against the current `main` before claiming this release is live.

## Release smoke test

Follow the README manual smoke test on the deployed website with separate owner/member sessions and a separate household. Test invalid input, forbidden actions, persistence/reload and network failure. Rehearse the complete university demonstration on the live URL; prepare role accounts and starting data without committing passwords. Treat device-specific NFC/push/GPS checks as pending until tested on real phones.

## Academy curriculum rollout — 16 November 2026

- PR #20 was approved by Beni and merged by Laura as merge commit
  `138dc67`; GitHub showed all four checks passing.
- Laura reports that `20261115150000_academy_curriculum.sql` was applied
  successfully to shared Supabase. This workspace did not inspect the hosted
  migration ledger or schema, so this is a team-reported status; do not run the
  migration again.
- On updated local `main` (`0d5d79d`), the Academy catalog and Tasks/Academy
  database tests passed: 6 tests in 2 files. `npm run typecheck` and
  `npm run build` also passed. The build retains existing dependency-comment and
  large-chunk warnings.
- The authenticated local UI showed the dog-trick path with 11 challenges,
  0/11 completed and 0 XP. No practice or progress was written. The first lesson
  loaded with its checklist and explicit save action. The multi-step `stay`
  challenge remained locked until preceding lessons are completed, so its live
  UI could not be inspected in this household without inventing training
  progress. Isolated database tests cover ordered subchallenge completion and
  one-time XP.
- The PR preview reported READY, but that does not prove the production Vercel
  alias serves this merge. Push delivery, live shared-schema behavior,
  household-to-household progress, and the full challenge flow after real dog
  practice remain unverified.
