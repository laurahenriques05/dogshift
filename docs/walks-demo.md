# Walk history, statistics and examples

Past Adventures at /walks?view=history lists real completed nondeleted walks,
newest first, 20 at a time. Today/week/month/year use household-local start dates
and Monday-based weeks. Month is default. Filtering precedes pagination; an empty
period differs from no saved history. Deleted shows only the recorder's removed
walks and restore controls. Other household data is never queried as a fallback.
Last Adventure on /walks shows only the latest eligible real walk.

Walking together retains real completed total, kilometres and pause-adjusted
duration. Show statistics reveals distance/time charts only, never a count chart.
Axes scale to actual values; empty periods show no invented data. Manual routine
checks and active/deleted/demo walks do not inflate completed totals.

## Explicit Demo walks

Demo walks is a separate status in history, available in development and production
for presentation. Benfica, Expo and Alvalade are labelled read-only examples using
local synthetic routes, never uploaded to Supabase or mixed into real household
history, Home, real totals, deleted entries or write actions. No demo switch should
silently inject fixtures into real summaries. Earlier unlabelled/development-only/
combined-statistics experiments are superseded and must not be restored.

## Approximate area names

Walk area names asks explicit consent, per account/device and off initially.
Once enabled, a visible saved route supplies one actual middle sample rounded to
0.01 degrees to Photon locality/district/city lookup. Never send full trace,
account/walk ID, credentials or referrer. Requests serialize with at least one
second spacing, timeout after ten seconds and cache bounded coarse labels in
memory. Choose area/city fields, not a business/address invented as a route name.
Labels represent one approximate area, not every place visited.

No GPS/consent/service means an honest generic fallback; failures offer Retry area.
Revocation aborts lookups and removes labels. Names are client-side, not persisted
or shared in hosted walk records. Public sample/CORS and stub consent checks used
no real user route. Provider availability is best effort.

Reference: https://github.com/komoot/photon/blob/master/docs/api-v1.md
Current permissions, migration rollout and release evidence: team sync / walks.md.
