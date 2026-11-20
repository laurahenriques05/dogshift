# Routine and map refinements — current reference

The approved routine behaviour is consolidated in
[walks-routine-period-names.md](walks-routine-period-names.md). Map behaviour is in
[walks-map-controls.md](walks-map-controls.md); releases/real pending work are in
[carol-walks-team-sync.md](carol-walks-team-sync.md).

Do not restore superseded behaviour: optional/blank routine hours, No routine for
now, estimate times inside circles, sunrise/geolocation naming, sorting stored
slots or a separate Edit card that stretches with the form. Do not implement the
two rejected layout templates. These older implementation iterations are retained
in Git history rather than repeated as current requirements.

Current CI presentation tests isolate browser configuration with an example origin
and reject database access. Run tests with browser environment values blank so a
local .env.local cannot mask missing-origin/SSR dependencies. No tests were weakened
or removed to hide the earlier push/PR failure; current Verify status must be read
for the relevant commit rather than inferred from old screenshots.
