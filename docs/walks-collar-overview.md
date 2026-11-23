# Walk overview and collar NFC

Current release/pending work: [team sync](carol-walks-team-sync.md).
The idle card follows Feeding: next-slot title/Start walk, completed routine-circle count
and last recorded start, restrained collar illustration and Set up collar tag.
No completion means 0; no recorded start means no last-start caption. Manual
check-ins count as completed circles, while ongoing walks do not. Without a
routine, the count uses actual completed walks.
Manual checks never fabricate GPS or a recorded start. Period/slot rules are in
walks-routine-period-names.md; hero names include Walk, circles do not.

## NFC setup section

Set up collar tag opens, focuses and scrolls to the NFC tag disclosure at the
end of /walks. Reduced-motion is respected. The disclosure copies Feeding's
three-step guide/layout and writer behaviour, adapted to walking; description
normal weight, 12px between unsupported-browser notice and copy action.

The exact public URL is generated from VITE_APP_URL and the current household:
`<VITE_APP_URL>/walks?action=start&household=<UUID>`. Never write credentials,
session tokens or localhost to everyday tags. The illustration is not proof of
an already written tag. Legacy unscoped links remain supported.

Compatible secure browsers with NDEFReader can write a URL record. The writer
has a 60-second timeout, Cancel, permission/error feedback and explicit opt-in
before replacing existing tag contents. Writing does not create a walk. Other
browsers offer Copy link for NFC Tools, with a manual-link fallback if copying
fails. iPhone browser writing is not supported.

### With NFC Tools

1. In Walks, select Set up collar tag, then Copy link for NFC Tools.
2. In NFC Tools: Write → Add a record → Custom URL/URI. Paste the complete link
   (or use URL/URI with https:// exactly once), then OK.
3. Keep only the intended walking URL record, select Write and hold the writable
   tag against the phone until success. Do not permanently lock it during setup.
4. Close the writer, unlock the phone, tap the tag and open the URL notification.
5. Sign in if needed, use Confirm walk, then select GPS/waste and confirm location/start.

The tag is a shortcut; the phone supplies GPS. Everyday users do not need to
open the writing app. Authentication/current membership and household mismatch
checks remain mandatory. Sign-in intent is retained in session storage for 30
minutes where available; expired intent is discarded. Disabled storage may
require tapping again. Merely opening a URL never records a walk.

## Limits

The approved flow is explicit confirmation, not immediate recording from a URL.
Confirm walk uses the next period name and Estimated hour; Change details opens
the saved routine editor. The full action=start URL is required for this popup;
/walks alone is ordinary navigation. Physical tag writing,
tapping, phone permissions and locked-screen GPS require actual Android/iPhone
validation. Component fixtures verified disclosure navigation, focus, copy feedback
and narrow/desktop containment, not physical NFC. No new schema for this section.
