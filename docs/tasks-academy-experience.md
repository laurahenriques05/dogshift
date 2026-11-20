# Tasks and Academy experience

Current source integrated into main; owner: Maria. No notifications UI or new
notification delivery is enabled by this presentation.

## Tasks

- Today is the first section, using the household's local date. Earlier overdue
  work and future dates follow it; completed history is collapsed at the bottom.
- Add/edit uses an accessible native modal with focus containment, Escape,
  focus restoration and the first field focused. Title, date and assignee are
  visible; repetition and details are disclosed on demand.
- Completion is one tap and attributed to its recorder. Only that recorder can
  undo it; completed records cannot be reassigned.
- An unassigned date has an I'll do it action. The assignee selector changes
  that occurrence only, never the entire recurrence series. Edit recurring series
  remains an explicitly named, separate action.
- API pagination retains materialized open dates rather than losing them beyond
  a server response limit. Completed history defaults to the last 90 days;
  source links can retrieve an older completed occurrence in the active family.

## Academy

The reference image informs the composition, not the curriculum. Academy remains
one dog-trick journey; no Health, walking-care or daily household routine modules
are reintroduced.

- One recommended next challenge leads, with its actual duration estimate and
  any saved subparts. Start/Continue is based on real practice/progress records.
- Three compact stages group the existing 11 challenges: First cues (1–3),
  Playful tricks (4–7), Build on your skills (8–11). They add no new curriculum
  or unlock rules. The detailed challenge list is disclosed on request.
- Practice today revisits achieved tricks; before the first achievement it
  points to the first challenge. Household XP, streak and recent contribution
  use persisted records. Stage achievements represent completed real challenges,
  and grant no additional XP.
- Simple lessons have a step-by-step reading guide. Reading a step changes no
  saved progress. Complex tricks keep the ordered saved parts, with the next
  part expanded and others compact.
- A practice can be saved while still learning. Achieving a challenge remains
  explicit and requires its checklist; parts alone award no XP. A completed
  lesson offers the next challenge. Existing SQL still grants XP only once.
- Retries keep the same operation ID for a subpart. Reloading after a save
  preserves the practice component and its confirmation instead of unmounting
  it under the full-page loading screen.

## Database and release

Two new migrations relative to the team main at this review base:

1. `20261117140000_tasks_reliability.sql` — PR #35's earlier date/departure fixes.
2. `20261118230000_task_quick_assignment.sql` — protected occurrence assignment.

Read-only ledger inspection on 20 November confirms these installed as
20261119112100_tasks_reliability and 20261119112114_task_quick_assignment.
Do not reapply source timestamps. No sender/phone delivery evidence follows
from that installation; future changes still require review/coordination.

The new assignment RPC locks the occurrence, verifies membership, validates the
recipient and checks the expected old assignee to reject conflicting edits.
Retries to the same target are harmless. An outsider sees the same access-denied
result for unknown/foreign records; completed activity stays immutable.

The existing task queue uses the occurrence assignee consistently and cancels
obsolete pending recipients, preserving sent history. This is compatibility with
the existing database contract, not delivery work. No push sender, keys, cron,
subscription UI or notification preference functionality is added or enabled.

Quick assignment has its hosted ledger entry. On other/older projects a missing RPC reports an
unavailable action; it must not show fake assignment success. Other existing
task and Academy actions keep their existing RPCs.

## Validation and limits

- Feature regression tests run in the isolated full suite; see verification.md.
- TypeScript and production build passed; existing dependency annotation and
  bundle-size warnings remain. `git diff --check` passed.

- Isolated SQL tests cover assignment permissions, stale edits, completion
  protection, occurrence-only changes and pending-recipient consistency.
- Presentation/model tests cover household-local Today grouping, no invented
  first-use activity, recommended challenge/part, attribution and full completion.
- Local browser inspection covers the real empty Tasks state, modal, Escape and
  focus restoration, the Academy dashboard, guide navigation and rejected
  completion with an incomplete checklist. No actual household task or Academy
  progress was saved in these browser checks.
- Real-device tests and populated multi-user browser writes remain unverified.
  Existing PGlite permission, deletion, XP and recurrence tests remain required.
- No external images, videos, packages, framework or hosted service were added.

### Challenge reading layout

Challenges retain their existing saved-practice flow, ownership rules, shared XP and prerequisites. The green illustrated guide now shows a larger, concise instruction per step; “How to do it” retains the complete original instruction, while explicit safety cautions remain visible. Sources, the knowledge reminder and family history remain expandable. Draft checklist progress is distinct from saved achievement; viewing steps never completes a challenge.

Challenge quick actions open native dialogs for practice, the existing knowledge reminder and family notes. Closing the practice dialog preserves its draft; saving keeps the existing RPC/XP rules and is protected from dismissal while busy. The guide uses the same Lucide dog as the Academy journey, with audio and bone icons and the app's sage palette.
