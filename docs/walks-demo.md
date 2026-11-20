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

## Saved walk titles

The current follow-up removes the area-names disclosure and automatic Photon
lookups from saved cards. Existing walk titles and explicit demo labels remain.
The isolated lookup helpers/tests remain internal; saved cards no longer call them.
