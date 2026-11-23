# Installed iOS walks

Carol authorized an iOS shell for background walk recording. It packages the
existing React app with Capacitor 8.6.2 and the same Supabase backend; the web app
remains available. Source implementation is not physical-device acceptance or an
App Store/TestFlight release. No hosted migration or Auth/access setting is needed
for the recorder, and no production deployment is authorized by this document.

## Review-only publication

This branch is published for technical review only. Teaching-staff approval for
this stack/native extension is still unconfirmed and must be resolved before
further rollout. AGENTS.md keeps its original prerequisite. No merge, deployment,
signing or distribution is included. vercel.json disables automatic deployment
for codex/ios-background-walks only; other branches keep their existing behaviour.
The Verify iOS workflow compiles without signing or hosted credentials.

| Dependency | Purpose |
| --- | --- |
| @capacitor/core and @capacitor/ios 8.6.2 | Package the existing React app and bridge to Swift. |
| @capacitor/cli 8.6.2 (development only) | Generate/sync/open the iOS project. |
| Apple Core Location and Network frameworks | Native GPS delivery and detected connection changes; included with the iOS SDK. |

## Recording contract

- Explicit Start walk uses the existing authenticated start RPC and GPS/waste
  setup. Native GPS is selected only inside the installed iOS app; Safari and
  Home Screen web apps retain browser limitations.
- Core Location has the location background mode, When In Use consent, fitness
  activity and a visible system location indicator. Pause/finish stop location.
  No Always permission or notification permission is requested.
- Native callbacks write an atomic, backup-excluded private file protected until
  first unlock. Pending points are not dependent on WebView timers. The file is
  bound to user/household/walk, stores no credentials and caps pending fixes at
  20,000; storage failure/full queue stops GPS and exposes an error.
- The React bridge uploads batches through existing RLS-protected RPCs and only
  acknowledges fixes after acceptance. Retries preserve sequence/content. It
  clears the file only after all points and the finish intent are confirmed.
- Uploads run while the interface can execute. Background collection is local;
  return to the app with internet to synchronize. The family sees the route after
  the walk is saved, not live background location.
- Detected network loss stops GPS. Online alone never restarts it. Reconnect
  verifies the original active server walk before explicit native resume. Pauses
  and pending finish survive; resume starts a new segment without interpolation.
- Account/family departure suspends the native recorder. Process termination
  preserves the file, but reopening requires explicit resume; force-quitting,
  revoked permission and system termination cannot promise uninterrupted GPS.
- Existing stationary policy remains: a new 2-minute question requires fresh,
  continuous GPS while visible; once asked, its unanswered 5-minute deadline is
  native. No new background notification or reminder flow is introduced.

## Build and install

Use Node 22.12+ and Xcode 26+ with the iOS SDK. Existing .env.local stays intact;
only public browser configuration belongs in the Vite build. Never embed server
keys or commit the generated web bundle.

```bash
npm ci
npm test
npm run test:ios:core
npm run ios:sync
npm run ios:open
```

In Xcode select the App scheme and your connected iPhone, choose your development
team for signing, and Run. The bundle ID is pt.dogshift.app; the team must confirm
ownership before distribution. No signing team, certificate or Apple credentials
are committed. This machine currently has Command Line Tools only, so local
installation needs full Xcode first. CI builds an unsigned simulator target and
runs the pure Swift recorder checks; that does not exercise real GPS.

Sign in with an existing confirmed demo account inside the installed app. Email
confirmation/reset links and HTTPS NFC tags still open the public website;
Universal Links/native Auth callback integration is not included. Keep tag URLs
unchanged. Do not start the same recording from Safari and the native app.
The generated app icon is a development placeholder, not final distribution art.

## Acceptance

Use an authorized test household and one recording device. Record device/iOS
versions and run an outdoor walk with the interface visible, screen locked and
another app open. Confirm stored native fixes after returning and server points
with matching sequences; no interpolated gap, duplicate walk or second stock/care
record. Check denied/revoked permission, pause/resume, no-network/Reconnect,
queued finish, relaunch, sign-out and another account's rejection. Verify native
GPS stops after finish. Do not put precise coordinates or credentials in evidence.

Local evidence: TypeScript suite (including native bridge rejection/retry tests),
TypeScript/build and portable Swift recorder checks. Full native build status
belongs to the branch's Verify iOS job; physical background GPS remains pending until
the installed build is tested. Safari diagnostic results do not validate this
native recorder. Existing hosted retention and SQL routine proposals are unchanged.
