# PawShare

[Live app](https://pawshare-laurahenriques05.vercel.app) ·
[Repository](https://github.com/laurahenriques05/pawshare)

Private, mobile-first care for one dog per household. React 19, TypeScript, Vite,
Tailwind/CSS, Supabase Auth/Postgres/private Storage and Vercel. No framework/backend
rewrite, second NFC app or Lost Dog Mode. Teaching-staff approval for this stack
is a team prerequisite, not established by this repository.

## Start here

Read [AGENTS.md](AGENTS.md) for rules, [collaboration](docs/collaboration.md) for
releases and [verification](docs/verification.md) for evidence/limits. Carol's
current feature and real pending work are in
[Walks team sync](docs/carol-walks-team-sync.md). There is no separate new-chat
handoff: these versioned documents and current code are the project memory.
Old implementation diaries were consolidated; Git retains their history.

## Team and responsibilities

| Member | Scope |
| --- | --- |
| Laura | Feeding, food stock, feeding NFC; proposed coordinator for shared contracts/migrations |
| Carol | Walks, GPS routes/statistics and walk NFC |
| Beni | Health, medication/documents/weight/vet and account settings |
| Maria | Family tasks, shared calendar, notifications and Academy |

One agent per checkout. Preserve teammates' work. Coordinate shared shell/styles,
routes/types/schema with Laura and affected owners. Members need to understand
the complete app; an agent's checks are not another member's review.

## Run locally

Use Node 22.x >=22.12 and npm. From this repository:

```bash
npm ci
# Only if .env.local does not already exist:
cp .env.example .env.local
npm run dev
```

Open Vite's printed localhost URL. Never overwrite existing .env.local or print
secrets. Required public browser settings: VITE_SUPABASE_URL,
VITE_SUPABASE_PUBLISHABLE_KEY and VITE_APP_URL. The latter is normally
https://pawshare-laurahenriques05.vercel.app for shared HTTPS tag links. VITE_
values are embedded in the browser; no service-role/database/SMTP credentials.
Restart Vite after configuration changes. npm run check:config is a separate
read-only live service request, not part of isolated tests.

Joining the existing shared project does not require migrations or dashboard
administration. Never reset the hosted database or blindly run all source files.
For schema work reconcile the actual ledger/definitions, review dependencies and
save append-only migrations. Some hosted timestamps differ from source filenames.
A new isolated project needs the reviewed complete migration chain, not only the
initial schema. Existing deployments require only explicitly authorized changes.

## Current source functionality

Auth supports email/password sign-in/registration, recovery and callback routes;
email delivery depends on hosted Auth/SMTP. Password show/hide preserves masking,
validation and password-manager metadata. Profiles store display names; never use
user-editable metadata as authorization.

Households have one dog, private photo/profile, roster, owner rename and private
email-bound invitation codes with explicit acceptance. After leaving, onboarding
permits another family/create. Multi-member owner departure requires transfer.
Source also includes preserving sole-member departure/inactive-family recovery;
its hosted migration is not established by source presence. Explicit permanent
account/family deletion is a separate guarded backend/Storage workflow, never a
shortcut for ownership or stock constraints.

### Feeding

Multiple dry/wet/treat products, opening baseline, package purchases, daily mixed-
food routines, grouped meal outcomes, stock forecast and low-stock notices. Stock
is baseline + purchases - food served (including discarded portions); skipped
serves nothing. Mixed-food writes/retries are atomic/idempotent. Creator-only meal
correction/removal; shared purchases/products. Duplicate warning concerns regular
meals too close together; treats are separate. No nutritional prescription.
Refresh is manual/window-focus, not claimed realtime.

[Feeding details](docs/feeding-handoff.md) retain schema, forecast adapter and
manual tests. NFC URL is /feed?quick=1&household=<UUID>: sign-in/member check,
prefilled confirmation, never food recording merely from opening/tapping. Supported
Android Chrome can write; other browsers use an external one-time writer.
If sign-in loses Feeding intent, tapping again is the fallback. Background push/
persistent forecast recomputation is separate from in-app stock notices.

### Walks

[Current state/pending work](docs/carol-walks-team-sync.md) ·
[Technical overview and hosted mapping](docs/walks.md)

- Explicit GPS/time-only start, optional waste recording, private ongoing routes,
  pause-adjusted duration, durable original-device queues and finish recovery.
  Actual device/location consent and confirmation remain mandatory for GPS.
- Optional shared walking routine with required Estimated hours, no location/solar
  calculation: Morning 07–12, Afternoon 12–20, Night 20–07. Live grouped names,
  stable slot identities and automatic progress from real starts. 96px circles
  use short names; hero uses Morning Walk/Afternoon Walk 1/Night Walk. No estimate
  time shown in circles, pending Summary or opt-out button.
- Compact Edit in the routine header, disabled until saved/during editing.
  Remove only when editing, between Save routine and Cancel. Save validates the
  actual form, rather than remaining disabled with completed inputs.
- Centred Walk Summary with real waste symbols/notes and truthful manual checks.
  Walking together retains real completed total; charts offer distance/time only.
- Full history and author event/note corrections preserve raw GPS; timeline updates
  immediately. Explicit Demo walks never mix into real totals/data.
- Approximate area titles require account/device consent; one coarse route sample
  goes to Photon, not the full trace. Labels are client-side, not persisted names.
- Non-Google credits only in the persistent small footer; native Google credits
  remain. No map-style picker on saved no-GPS routes. Dog places are opt-in;
  initial location animation approaches world → device with reduced-motion support.
- Set up collar tag opens/focuses/scrolls to the final Feeding-style NFC section.
  Three steps, browser writing where supported, NFC Tools fallback. Description
  normal weight; 12px between warning and Copy action. URL:
  /walks?action=start&household=<UUID>. It opens setup, not unattended recording.

Main includes PRs #65–#68; #68 merged as
72016adb6ea353f6daca5006698d34ebe8ec36a2. The four final screenshot adjustments
are implemented, not outstanding. Neither rejected styling template was added.

**Still pending:** hosted family-deletion RPC rollout (UI is merged, server still
only permits author deletion); routine SQL strict-hour hardening/reconciliation;
physical NFC/Android/iPhone and background GPS acceptance; immediate NFC start
following required consent; exact production alias verification. See team sync
before acting. No Walks calendar producer or server-push integration is implemented.

### Health and account

Shared appointments, vaccinations, schedules/dose logs, weight, contacts, private
documents/folders and visit summaries are in source. Upcoming/Past records and
native modal forms preserve honest empty/error states; clinical instructions come
from users/veterinarians, not generated dose/vaccine recommendations. Weight uses
actual dated measurements, not fabricated trends. Document downloads are private;
file deletion/cleanup follows uploader/owner and guarded server rules.

Feature specifications and rollout distinctions:
[Health/account](docs/remaining-health-account.md),
[appointments](docs/vet-appointments.md), [medication](docs/medications.md),
[vaccinations](docs/vaccinations.md), [folders](docs/health-document-folders.md),
[calendar/source links](docs/health-calendar-links.md).
Manual SQL reports may not appear in the ledger; do not assume absence means safe
to reapply. Confirm definitions and Beni/Laura coordination. Edge Function sources
and UI presence do not prove deployed deletion, Auth/Storage cleanup or push.

### Tasks, calendar and Academy

Tasks use household-local Today/overdue/upcoming groups, modal add/edit, explicit
series changes, occurrence-only assignment and recorder completion/undo. Real
materialized dates are paginated. Calendar opens month view with existing task,
Feeding forecast and Health source links. Stable source IDs and cancellation belong
to Maria's shared contract, not duplicate feature reminder systems.

Academy is one progressive 11-challenge dog-trick journey. Practice, prerequisites,
parts, explicit achievement, one-time shared XP and streak derive from saved data;
reading never completes a challenge. Old non-trick IDs/history remain internal.
Walking basics is archived and /walks/learn returns to Walks. No new curriculum or
invented progress is authorized by an available adapter.

See [Tasks/Academy experience](docs/tasks-academy-experience.md),
[reliability](docs/tasks-reliability.md), [shared integration](docs/tasks-calendar-academy-proposal.md)
and [lesson authoring](docs/academy/lesson-template.md).
Read-only ledger inspection on 20 November confirms Tasks reliability and quick
assignment installed (20261119112100, 20261119112114), alongside Tasks/Push/Academy
schema. This does not prove sender secrets/deployment/cron or real phone delivery.
Feeding/Health persistent sync/cancel and background recomputation remain distinct.
Do not enable delivery or change preferences as part of unrelated UI work.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

Use isolated tests, never real care data. Run browser tests at narrow/mobile and
desktop widths; keep sample fixtures separate from hosted account/phone evidence.
Node 22 is the required runtime. See docs/verification.md for the latest measured
counts, known warnings and remaining integration/device checks. Type generation
must reconcile hand-written custom types; never overwrite them blindly.

Manual acceptance uses designated disposable accounts/data: owner/member/outsider,
read/reload/save/retry, invalid/forbidden actions, timezone/DST, GPS permission,
offline recovery, NFC and provider failure. Do not send real notifications/emails
or delete real activities during tests.

## Releases and architecture

Feature branches → push → PR → another member review + passing CI → main → Vercel
Git production. Verify exact merged commit, READY deployment and production alias;
a preview or success badge alone is not all of that evidence. See collaboration.
Never force-push shared branches or deploy a feature tree labelled as main.

src/app owns routing/shell; src/features owns feature logic; src/components/ui owns
shared primitives; src/lib owns infrastructure/types. Auth owns credentials;
Postgres/RPC enforces permissions; Storage remains private. Keep calm green/cream,
clear primary action, compact forms, accessible focus/touch targets and honest
states. [UI rationale](docs/ui-design-research.md). Shared footer terms/privacy/
security are project information, not a completed legal audit or new acceptance flow.
