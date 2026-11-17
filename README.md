# PawShare

**Live website:** https://pawshare-laurahenriques05.vercel.app

**Repository:** https://github.com/laurahenriques05/pawshare

PawShare is a private, mobile-first dog-care application for a household sharing one dog. This university group project uses React 19, TypeScript, Vite, Tailwind CSS, Supabase Auth/Postgres/Storage, and Vercel.

## Team and responsibilities

| Member | Feature ownership |
| --- | --- |
| Laura | Feeding, food stock, feeding NFC; proposed integration coordinator for shared files and migration ordering |
| Carol | Walk tracking, GPS routes/statistics, walk NFC |
| Beni | Health, medication, treatment/document/weight history, vet details, account settings |
| Maria | Family tasks, shared calendar, notifications, Academy |

Feature owners implement their own UI, rules, migrations and tests. Coordinate shared changes with Laura and the affected owner before editing them. Anyone must be able to explain the whole application. See [AGENTS.md](AGENTS.md) for agent instructions and [the collaboration guide](docs/collaboration.md) for releases. Teaching-staff approval for the non-Python stack must be confirmed by the team; this repository does not establish that approval.

## Current functionality

- Email/password registration, sign-in, sign-out, confirmation return and password recovery through Supabase Auth. Email delivery depends on the project's Auth/SMTP configuration.
- Private household creation and one-dog onboarding, without needing invitations; dog profile editing and private photo upload displayed beside the dog's name on Home.
- Family roster, owner-only discreet family rename, email-bound invitation codes created by household members, invitation acceptance, and household departure. An owner must select another existing member before leaving; a sole owner cannot currently leave. After leaving, onboarding offers creating a household or joining an existing family.
- Feeding and stock: multiple dry/wet/treat products, opening stock, package purchases, stock forecasts and in-app restocking notices.
- Saved daily meal routines with explicit Edit/Save/Cancel, meal times, mixed foods/quantities and notes; today's meal checklist and quick recording; Given, Partially eaten, Refused and Skipped outcomes.
- Stock decreases by food served, including discarded portions, rather than food eaten. Own feeding corrections/removal, shared purchase/product editing, atomic writes, retry protection and audit history.
- A duplicate regular-meal warning only when another meal is recorded too soon. Treats are separate. The threshold uses the shortest planned gap, an explicit override, or the meals/day fallback.
- Feeding NFC URL and confirmed quick logging; optional in-app tag writing on compatible Android Chrome browsers.

Walks includes GPS recording, private active routes, completed history, statistics, corrections, a Home summary and a confirmed NFC start URL. Tasks, Calendar and the progressive dog-trick Academy are merged into `main`. PR #20 adds eleven challenges; the earlier non-trick module IDs and XP history remain internally, while the old course is no longer shown. The PR was approved by Beni and merged by Laura on 16 November 2026. Laura reports that the curriculum migration was successfully applied to shared Supabase; this repository review has not independently inspected the hosted schema. See [Tasks, Calendar, Academy and Notifications](#tasks-calendar-academy-and-notifications) for the remaining rollout limits. Lost Dog Mode has been removed from scope. Current shared Feeding data refreshes on manual refresh/window focus; the clock update does not provide cross-device live synchronisation.

For the design references and the rationale for keeping PawShare's interactions calm and accessible, see [UI design research](docs/ui-design-research.md).

## Run locally with the shared database

Install **Node.js 22.12+ (22.x recommended)** and npm. Clone the repository and open its folder:

```bash
git clone https://github.com/laurahenriques05/pawshare.git
cd pawshare
npm ci
cp .env.example .env.local
npm run check:config
npm run dev
```

Open the localhost address printed by Vite (normally http://localhost:5173). If you already have the repository, fetch/pull the reviewed branch rather than cloning again; `main` is the intended release branch.

The checked-in example contains the shared project's public browser settings. Required configuration:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Shared Supabase project API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Matching public publishable key; never a secret/service-role key |
| `VITE_APP_URL` | `https://pawshare-laurahenriques05.vercel.app` for shared/live links |

`.env.local` is ignored by Git. Vite embeds `VITE_` values in the browser bundle: do not put secrets in them. Restart the dev server after changing configuration. `check:config` makes a read-only request to the configured service; it is separate from the offline automated tests. An Invalid API key error usually requires checking the matching URL/key and restarting the correct dev server.

**Joining the shared project does not require running migrations. Do not reset or reapply migrations to the shared hosted database.** A developer needs a Supabase dashboard invitation only to administer the service, not to use PawShare.

## Database setup for a new, separate project

The source of truth is `supabase/migrations/`. Apply every migration once, in filename order, to a new project; the initial migration alone is insufficient. This includes profiles/households/dogs, private dog-photo storage, invitations and codes, leaving/ownership transfer, and all three Feeding migrations. See [the Feeding handoff](docs/feeding-handoff.md).

Use the Supabase SQL Editor or adopt the CLI workflow after checking its current help. Local CLI config is not currently committed: create it with `supabase init` before using the local Docker stack. Never run a remote reset. Review pending migrations against the target before applying them. Database schema and application release changes must be coordinated.

For the hosted application, configure Auth Site URL as the live website. Allow these redirects, plus local equivalents when developing:

- `https://pawshare-laurahenriques05.vercel.app/auth/callback`
- `https://pawshare-laurahenriques05.vercel.app/reset-password`
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/reset-password`

Enable email/password sign-in. If email confirmation is enabled, configure dependable SMTP before promising public registration; the default sender has restrictions. Keep standard confirmation-link templates. Never disable security settings as a workaround without explicit agreement. Record configuration changes without copying credentials into documentation.

## Invitations and household membership

In **More → Family**, enter the recipient's email, create an invitation code, and share it privately. Codes expire after seven days; replacing one for the same email invalidates the previous code. PawShare does not automatically email invitation codes. The recipient signs in with the invited email and uses **Join an existing family** on household onboarding to enter and accept the code. Email verification requirements still apply. Legacy `/invite/:token` routes remain supported.

Join-another-family controls belong on onboarding after leaving the current family, not on the active family page. Owners transfer ownership to an existing member when leaving. Sole-owner departure/deletion and full account deletion remain unfinished; do not delete auth users directly to bypass ownership/history constraints.

## Feeding and NFC

See [Feeding details and manual checks](docs/feeding-handoff.md). NFC tags contain an HTTPS URL, never credentials:

```text
https://pawshare-laurahenriques05.vercel.app/feed?quick=1&household=<household UUID>
```

The person must sign in and belong to that household. Tapping opens the confirmation flow; it never records a meal just by opening a URL. If sign-in loses the quick-action intent, tap again after signing in.

Compatible Android Chrome devices can write tags from PawShare. iPhone browsers cannot write NFC tags: use a trusted iPhone NFC-writing app once to store the URL. Everyday use opens PawShare directly without that writing app. Physical tags and device-specific behaviour still need testing. Walk tags can use `/walks?action=start`; see docs/walks.md for the confirmation flow and phone-testing limitations.

## Commands and verification

```bash
npm test                 # Isolated automated tests, including embedded PostgreSQL
npm run typecheck        # TypeScript checks
npm run build            # TypeScript + production bundle
npm run preview          # Serve the local production build
```

GitHub Actions runs install, tests and build on pushes/pull requests. On 11 November 2026, **93 tests across 11 files passed**, and the production build passed. Tests exercise validation, invitations, photo policies, household isolation, Feeding calculations, migrations, creator permissions, stock deductions and retries. This is not proof of hosted email delivery, every browser workflow, physical NFC or push delivery. See [verification evidence and limits](docs/verification.md).

The handwritten TypeScript database types include application contracts. If generating Supabase types, generate to a temporary file and reconcile changes; do not blindly overwrite custom exported types.

## Manual smoke test

1. Register/sign in on the deployed app; verify email confirmation and password recovery separately when enabled.
2. Create a household and dog without inviting anyone. Reload; confirm persistence and no duplicate household.
3. Edit the dog, upload/replace its photo, and verify Home. Try invalid input and an oversized image.
4. Invite a second account by code, accept with the matching email, and verify both see the same dog. Wrong-email/revoked/expired invitations must fail.
5. Add food, buy two packages, save a two-meal mixed-food routine and log a meal. Confirm checklist, history and stock served quantities after reload.
6. Try a too-soon meal, a refused/partial/skipped result, own corrections, another member's forbidden correction, and another household's isolation.
7. Test owner rename and departure with transfer in a disposable demo household. Verify joining another family is offered after leaving.
8. Check mobile/desktop, keyboard navigation, visible focus, offline errors and retry. Use two devices to check the actual refresh behaviour.

## Architecture and security

`src/app` owns routes/shell; `src/features` owns domain workflows; `src/components/ui` holds shared UI; `src/lib` holds clients, types and validation. Supabase `auth.users` owns credentials; `profiles` stores display metadata. Application tables have household/user-scoped RLS, and privileged transactional operations enforce membership and ownership on the server. Dog photos use private Storage and short-lived signed URLs.

## Releases

The production application is hosted by Vercel, with SPA rewrites in `vercel.json`. Set the public configuration at build time. The target workflow is **branch → push → pull request → another member's review → passing checks → merge to main → deploy that main commit**. Earlier direct releases are historical exceptions, not the future workflow. Do not claim GitHub/main/production are aligned until their actual commit IDs have been verified. See [release steps](docs/collaboration.md).

The basic provider can select among existing memberships, but additional household creation/invitations are deliberately outside this milestone. Initial contracts are hand-maintained until connected schema generation is available.

## Hosting later

Deploy `dist/` after `npm run build`, with an SPA fallback to `index.html` for all non-file routes. Set the three public environment variables at build time and add the deployed callback/reset URLs in Supabase. `public/_redirects` supports compatible static hosts; `vercel.json` supports Vercel. Hosting is not provisioned by this milestone.

## Dog profile photos

Apply `supabase/migrations/202611090001_dog_photos.sql` after the initial schema. It creates a **private** `dog-photos` Storage bucket and household-restricted policies. Never make the bucket public. No additional environment variables are needed.

In More → Dog profile, choose **Upload or change photo**. JPG, PNG, and WebP inputs up to 10 MB are accepted. The browser downsizes and re-encodes the image to JPEG, removing embedded location metadata. Photos save immediately; other profile fields still use Save changes. The photo appears beside the dog's name on Home and remains after reload. Existing households need no data backfill; dogs without photos show a paw icon.

Images use a deterministic `<household-id>/<dog-id>.jpg` path, so no schema column or permanent public URL is required. Reads use five-minute signed URLs renewed while mounted. Members cannot read, upload, or replace another household's images.

Manual checks after applying the migration: upload an image, return Home, reload, replace it, cancel the picker, try a file over 10 MB, and confirm another account cannot access the object. Embedded PostgreSQL tests exercise the storage policies against a minimal Storage schema; live Storage upload/signing still requires verification against the connected project.

## Family invitations

Apply `supabase/migrations/202611090002_family_invitations.sql` after the existing migrations. The live project has this migration applied. No email delivery provider or new environment variables are needed for link-based invitations.

**Owner:** More → Family → enter the recipient's email → Create invitation link → Copy link. Share it yourself by message or email. PawShare does not send invitation emails automatically. Links expire after seven days. Revoke an unused invitation from the list; generating a replacement for the same email invalidates the previous link.

**Recipient:** open the link, sign in or register with the invited email, confirm your email if needed, then explicitly accept. New users join the existing household directly, without creating another household or dog. Existing users retain their households and can switch using the household selector at the top. The selection persists on that browser per user.

Signup and confirmation keep a pending invitation in browser storage. If confirmation is opened on a different device/browser (or storage is disabled), reopen the original invitation link after confirming your email. There is no automatic acceptance, and a link cannot be used with a different or unverified account. Back to PawShare on the invitation page clears pending navigation.

Owners see invitation status and may revoke pending links. Members see family display names and roles, but not the invitation list or other members' email addresses. Owner transfer, member removal, and automated invitation email delivery are outside this change.

Security: 240+ bits of random token entropy, SHA-256 digests at rest, owner-only issuance/revocation, confirmed email checked in `auth.users`, RLS on invitations, explicit function grants, row locking for atomic acceptance, idempotent retries, and fixed member role. Raw tokens are returned only once when creating links. Invitation routes have noindex/nofollow and the app uses a no-referrer policy.

Manual integration checks: invite an existing user, invite a new user, test an incorrect email account, confirm a new account, accept twice, revoke a link before use, generate a replacement, and verify both members see the same dog/photo. Verify the member has no invite or revoke controls and cannot use those RPCs directly.

## Rename a family

Owners can open More → Family and tap the small pencil beside the family name. A compact editor appears with Save and Cancel; Escape also cancels. The saved name updates the active header, Home privacy text, More card, family page and household selector immediately. Other members see the stored name when they next load the household. Names are trimmed and must contain 1–80 characters. Existing invitations remain valid and display the current name. Members cannot rename the family; the original owner-only household UPDATE policy enforces this on the server. No additional migration or configuration is needed.

## Home design polish

Home now presents a compact private dog portrait beside the dog’s name, a real household-member summary, an owner-only Invite someone shortcut, and the dog's saved details. The family summary uses the existing authorized roster RPC, with loading, empty, error and retry states. Owners and members see the appropriate family action. Missing profile fields are labeled clearly. No care logs or statistics are invented. The responsive layout was visually checked at desktop and 390px mobile widths using local preview fixtures; screenshots are design previews with sample content, not live account data. No new database migration is needed.

Home contains live Feeding, Walks, Tasks and Academy summaries, with a Coming soon preview for Health. These summaries read real household data and include loading/error states; they do not imply that push delivery or cross-device realtime has been verified. Existing family membership and invitations remain available in the family card.

## Walks

Walking together recalculates completed walks, kilometres and duration for Today,
This week, This month or This year in the household timezone. Its chart groups
walks by hour, day or month, using the same period selection and selector as Past
Adventures. The chart opens with Show statistics and can display walk count,
kilometres or minutes on an automatic scale. See [local preview data](docs/walks-demo.md) for fixture limitations.

The Walks feature on `codex/walk-tracking` adds private GPS recording, history,
calendar summaries, recorder-only corrections, reversible deletion, a Home summary
and a confirmed NFC start link. Apply only the new
`supabase/migrations/202611110001_walks.sql` migration to the existing project
before using it. See [Walks setup and validation](docs/walks.md) for full rollout
instructions and [phone GPS tests](docs/walks-gps-testing.md) for required real-device
checks. No new browser keys or paid map service are needed.

Confirming the end in Walks opens the completed route after it is saved; offline
completion displays a pending-sync notice. NFC on the leash opens the start
confirmation, while the phone carried by the walker supplies GPS positions.

Route maps default to a light vector basemap with white streets, subdued buildings,
green parks and the application's dark-green GPS trace. MapLibre GL JS 6.18.0
renders public OpenFreeMap data worldwide; there is no fixed city boundary or
API key requirement for this provider. A Leaflet street-map fallback supports
browsers unable to initialize the vector renderer. The previously prepared Google
provider remains optional; see [Google setup](docs/walks-google-maps.md).

Each map has Start/Finish markers, **Reproduce route** and Fit route controls.
Playback draws the recorded path over approximately 12 seconds with only the start marker;
Stop replay restores the whole route. It does not record GPS, change saved points,
recalculate statistics or connect gaps. Reduced-motion preferences show the full
route without animation. Normal scrolling does not zoom, while explicit pinch,
keyboard and +/- controls remain available. Map credits sit below the vector image. The optional OpenFreeMap branding is
omitted; required OpenMapTiles and OpenStreetMap credits remain.

The Walks landing page shows **Last Adventures** with the latest completed walk.
**Show more** opens the full **Past Adventures** view at `/walks?view=history`,
with completed records filtered by Today, This week, This month (default) or
This year in the household timezone. Weeks begin on Monday; filtering happens
before pagination, and a Load more control reveals additional matching walks.

History/detail cards and accumulated distance use kilometres, alongside duration
and average speed. Three local presentation walks in Past adventures (Benfica,
Expo and Alvalade) contribute to local totals without demonstration badges. They
and their detail pages are excluded from production; real household data and Home
stay intact. See [presentation provenance](docs/walks-demo.md). No new migration
is required. Street maps need internet; requests share viewed-area/IP information
with the provider. See [map style notices](public/licenses/walk-map-style.txt).

Stationary automatic ending remains optional and foreground-only. Shared mobile
notifications and Academy progress await the team's interfaces. Background or
screen-locked GPS and physical touch-device reliability remain unverified.

## Health and account additions

See [remaining Health/account setup and release checks](docs/remaining-health-account.md)
for treatment history, vet contacts, private documents, weight synchronization,
Home summary, account settings and the server-side deletion rollout. New migrations
and Edge Functions require coordinated review/deployment; local UI changes do not
apply schema or publish server functions.

## Tasks, Calendar, Academy and Notifications

For the task reliability corrections and the single pending migration, see
[Tasks reliability and rollout](docs/tasks-reliability.md). Earlier migration
rollout reports do not include this follow-up.

The merged Tasks/Calendar/Academy feature adds household tasks with
one-time/daily/weekly/monthly recurrence, completion attribution, a shared month
calendar, Academy progression, Home summaries, notification preferences, and a
Web Push service worker/sender. Maria's chosen demo rules and the three small teammate
integration checks are in
[the feature handoff](docs/tasks-calendar-academy-proposal.md). This code is
merged into `main`. Laura is the sole person applying migrations to the shared
Supabase project. PR #20, approved by Beni, adds the progressive dog-trick
curriculum and was merged by Laura on 16 November 2026. Laura reports that its
migration completed successfully; do not apply it again. The curriculum makes the
dog-trick path the main course and includes shared, ordered subchallenge steps
for four complex tricks; simpler tricks remain one short challenge. Parts do not
award XP or unlock the next trick; the family earns XP once after explicitly
completing the full challenge. Hosted schema was not independently inspected in
this handoff; do not record real household progress until the dog has practised.

Calendar events read their source records (tasks, Feeding restock projections,
Health appointments, vaccinations and scheduled medication doses) and link back
to those records; the calendar does not create duplicate source rows. Task
reminders are queued server-side. The migrations also provide common
`sync_household_notification` and `cancel_household_notifications` RPCs for
Laura, Beni and Carol to schedule/update/cancel their feature reminders;
integration from those features still needs their review and implementation.
Feeding/Health event display works from the source records. Walks does not yet
publish events to this calendar.

The Vite app runs locally and `.env.local` points to the shared Supabase project.
A local UI build does not create or apply database schema. If PostgREST cannot
find an RPC after an approved migration, refresh the Supabase API schema cache;
do not reset the database or re-run older migrations.

### Safe rollout

1. Laura reported completing the coordinated migration rollout. Never reset the
   shared project or re-run migrations she has already applied.
2. The Academy curriculum migration is
   `20261115150000_academy_curriculum.sql`. Laura reports that she applied it
   successfully after checking prerequisites; do not run it again. If hosted
   behaviour disagrees with the local/PR preview, Laura should inspect the
   migration ledger and schema before taking further action.
3. For real push delivery, generate VAPID keys (`npx web-push generate-vapid-keys`)
   and set the public VAPID key as `VITE_WEB_PUSH_PUBLIC_KEY` in the local/Vercel
   build environment. It is a public key; never put the private key in a `VITE_`
   variable. The Edge Function needs server-side `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `PUSH_CRON_SECRET` secrets.
4. Deploy `supabase/functions/send-push` after the migrations. Schedule it once
   per minute with Supabase Cron/`pg_cron` + `pg_net`, send its
   `x-cron-secret` header from Supabase Vault, and keep that secret out of the
   browser and repository. The sender uses the service role only inside the
   server function.
5. Verify delivery on real devices. On iPhone/iPad, Web Push requires the site
   to be installed to the Home Screen and permission granted from that installed
   web app; support differs by browser/platform. No real push delivery or
   background behavior is verified by the local tests. Do not treat the visible
   subscription/settings UI as proof that a notification was delivered.

The optional local setting is documented in `.env.example`. Existing three
`VITE_` Supabase values remain the only required configuration for app use.
Task reminders and their escalation are materialized by the database; the
scheduled Edge Function is required to deliver them to subscribed devices.

Carol’s Walks integration review is recorded in [the handoff](docs/carol-integration-review.md).

The follow-up [PR #12 review corrections](docs/pr12-review-fixes.md) preserve
completed-task history during account deletion, remove stopped tasks' future
open dates and prevent requeueing sent reminders. They require the additional
`20261115140000_task_review_fixes.sql` migration after Tasks/Academy and Push;
this is source awaiting coordinated review/application, not a hosted rollout.

Start Walk now opens a location confirmation map with live device geolocation,
reported accuracy, and **Confirm current location** / **Another location**.
Manual mode searches addresses and places worldwide on explicit submission via
Photon, or allows selecting a point on the map. Map tiles use the existing
OpenFreeMap street style. The selected manual point is a pre-walk preview; it
is not persisted as a GPS fix or substituted for the actual recorded route.
No walk is created until confirmation. Permission errors, timeout, unavailable
search and map failures offer recovery. Phone GPS and consent still require
real-device validation over HTTPS; worldwide coverage and accuracy depend on
the device and map/search data. See [location confirmation checks](docs/walks-start-location.md).

Walk setup brings **Route Recording with GPS location** and **Record Dog Waste**
together as switches. Enabling waste recording reveals **During the walk** or
**At the end** on the same screen. GPS-enabled walks then confirm location;
time-only walks skip it. Enabled walks expose **Record pee**
and **Record poop** at the selected stage, with totals in the saved walk summary.
This feature requires the reviewed migration
`20261116170000_walk_dog_waste.sql` before it can start walks/save records against
a hosted database. It has only been tested in an isolated local database; no
hosted migration has been applied. See [dog waste handoff](docs/walks-dog-waste.md).

Walk setup now starts with **Track your route?**. **No, record time only** skips
location permission and the map, retains dog waste options and records duration
without distance/pace. GPS choice is persisted and respected after reloading.
This also requires the reviewed, unapplied migration
`20261116190000_walk_tracking_choice.sql` after the dog-waste migration.

Past Adventures also filters **Not deleted / Deleted** alongside the period.
Deleted view shows only the current user's deleted completed walks and opens a
centred confirmation to restore them; those walks remain excluded from statistics.

Saved walk cards expose a small delete cross for their author, with a centred
Confirm delete dialog. Deleted cards offer Restore walk. Showing retained GPS
and summary data inside Deleted history also needs the reviewed, unapplied
`20261117130000_deleted_walk_owner_preview.sql` policy migration; access remains
limited to the author while deleted. No hosted application is claimed.
