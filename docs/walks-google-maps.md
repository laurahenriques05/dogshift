# Optional Google Maps provider

Without a configured Google key, maps use MapLibre/OpenFreeMap with Leaflet fallback.
Google code remains optional when VITE_GOOGLE_MAPS_API_KEY is configured; do not
claim it is active, billed/configured or runtime-verified without checking the
actual environment and device. No keys or billing changes were made by Walks.

The official @googlemaps/js-api-loader lazily shares Maps JavaScript API loading.
Routes use actual saved segments, keeping gaps open. Google native attribution
must remain. Cooperative gestures preserve page scrolling; deliberate pinch/
keyboard/zoom controls remain and double-click zoom is disabled. No consumer-map
tiles or screenshots are copied. Live GPS still requires phone consent.

For a team-approved Google setup: enable Maps JavaScript API/billing on the team's
Cloud project; use a browser key restricted to that API and approved website
origins; set the ignored local/public build variable through normal configuration
review; restart/rebuild. Never overwrite .env.local or expose admin credentials.
Use quotas/alerts through the normal Cloud workflow and verify key/domain denial,
load/retry, all maps and physical gestures. Google SDK requests can expose map
coordinates and network/device information; preserve provider privacy disclosures.

Loader tests mock Google and cover missing-key, shared loading and failure retry.
They are not live Google, billing or phone evidence. Real-history isolation and kilometre formatting follow walks-demo.md; demo walks
are not exposed in the app and no provider-specific totals exist.

Official references:
- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- https://developers.google.com/maps/documentation/javascript/interaction
- https://developers.google.com/maps/api-security-best-practices
