# Walk start and location

Start walk opens explicit GPS and waste choices. Time-only starts without a GPS
request. GPS-enabled starts proceed to current-location confirmation, browser
permission and an HTTPS-only device watch; no location is taken from the NFC tag.
The map approaches from world to current neighbourhood in about three seconds,
respecting reduced motion. Recenter and Retry remain; retry clears the old fix
and disables confirmation until a replacement is ready. Cancel/Escape returns
focus, and keyboard focus stays inside the dialog while open.

Numeric position/accuracy and honest errors remain. The paragraph Your location
is approximate / Move outdoors was explicitly removed. Permission diagnostics
are behind details; denied/unavailable service is not a fabricated location.
No manual invented GPS path or fixed city is saved. Starting GPS still requires
a usable position and server-authorized start. Empty/live maps distinguish waiting
for the first point from a completed time-only route.

Consent/location for actual recording is separate from location-free routine
setup and from optional approximate-area history naming. See walks.md for privacy
and walks-gps-testing.md for real-phone acceptance. Local sample/map checks are
not real GPS evidence; screen-lock/background delivery remains unverified.
