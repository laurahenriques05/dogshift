# DogShift

[Live app](https://pawshare-laurahenriques05.vercel.app) · [Repository](https://github.com/laurahenriques05/dogshift)

DogShift helps a family share the daily care of one dog: plan responsibilities,
record what actually happened, and see the same care history on mobile or desktop.

## Main features

- **Feeding:** shared meal routines, confirmation, food purchases and stock tracking.
- **Walks:** GPS or time-only recording, pause/resume, routines and statistics.
- **Family and Tasks:** private household membership, invitations, assignments and a shared calendar.
- **Health:** appointments, medication, vaccinations and private documents.
- **Academy:** guided dog-training challenges and progress.

## Quick start

Use Node 22.x (at least 22.12) and npm. From the repository root:

```bash
npm ci
# Only if .env.local does not already exist:
cp .env.example .env.local
```

Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and VITE_APP_URL in
.env.local using the team's public browser configuration. Use the live HTTPS app
URL for VITE_APP_URL when setting up NFC tags. Never put service-role keys,
database passwords or other secrets in VITE_ variables or Git.

```bash
npm run dev        # Open the localhost URL printed by Vite
npm test           # Isolated tests; no hosted care records or emails
npm run typecheck
npm run build
```

To use the existing team backend, do not run migrations. For a new isolated backend,
follow the reviewed migration setup with the team; never reset the shared database
or blindly replay migration files. npm run check:config is a separate read-only
live connectivity check. Keep existing .env.local configuration intact.

## Current limits

- The public app URL above was checked on 23 November. The newer
  dogshift-lmbtah-7143.vercel.app alias redirects to Vercel login; do not use it
  as the public demo/NFC URL until the owning team verifies access.

- Physical NFC, outdoor/background GPS, screen lock and offline phone recovery
  still need real-device acceptance; browser support and location consent apply.
- Completed walk records older than 168 hours are permanently removed by the
  hosted retention job, checked every minute in batches of 1000. Active walks are
  preserved. Only minimal private proof of linked Task completion remains.
- Notifications are out of scope. Do not promise push/email reminders.
- Account/family deletion Edge Functions were not deployed in the 23 November
  hosted check; their UI/source alone is not evidence of working cleanup.
- Live multi-account workflows and file cleanup still need disposable-account
  acceptance. Local tests are not proof of every hosted integration.
- React/TypeScript replaces the course's Python stack; teaching-staff approval
  must be confirmed by the team, not inferred from this repository.

## Team and responsibilities

| Member | Student number | Scope |
| --- | --- | --- |
| Laura Henriques | 62479 | Feeding, food stock, feeding NFC; proposed coordinator for shared contracts/migrations |
| Maria Carolina Alves | 62808 | Walks, GPS routes/statistics and walk NFC |
| Maria Benedita Azevedo | 62526 | Health, medication/documents/weight/vet and account settings |
| Maria Ortigão Malato | 51854 | Family tasks, shared calendar, notifications and Academy |

## How it is built

React 19, TypeScript, Vite and Tailwind/CSS provide the interface. Supabase provides
Auth, Postgres and private Storage; Vercel hosts the web app. Database policies and
RPCs enforce permissions. src/app owns routing/shell, src/features feature logic,
src/components/ui shared controls, and src/lib infrastructure/types.

## Technical documentation

- [Project rules](AGENTS.md) · [Collaboration and releases](docs/collaboration.md)
- [Verification evidence and limitations](docs/verification.md)
- [Feeding and stock](docs/feeding-handoff.md)
- [Walks status and rollout](docs/carol-walks-team-sync.md) · [Walks technical details](docs/walks.md)
- [Health/account](docs/remaining-health-account.md) · [Private folders](docs/health-document-folders.md)
- [Tasks and Academy](docs/tasks-academy-experience.md) · [Calendar integration](docs/calendar-care-routines.md)
- [Care-task completion](docs/occurrence-care-tasks.md) · [Calendar categories](docs/calendar-topics.md)

Preserve teammates' work and coordinate shared changes. Reviewed feature PRs go
into main before release. Verify the deployed commit and public URL; a local build
or preview does not establish production behaviour. Detailed behaviour and rollout
history belong in the linked documents and Git history.
