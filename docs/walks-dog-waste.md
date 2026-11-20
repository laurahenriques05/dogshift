# Dog waste and walk deletion

Start offers optional waste recording: off, During or At the end. During mode
shows Pee/Poop line-icon actions while recording and records server-timestamped
idempotent events. End mode hides those controls while walking, then offers final
counts; these submission times are not pretended to be actual timeline events.
Finish confirmation shows read-only During totals. Existing drop/poop symbols
represent counts in summaries, with accessible text and no old bottom divider.

RPCs validate current membership, recorder, mode, walk state and kind; repeated
UUIDs do not duplicate events and conflicts fail. Active data stays recorder-
private; current members read after completion. End-mode recording and correction
preserve existing permissions; offline retries do not claim unacknowledged saves.

## Delete and restore

Full history, Last Adventure and detail expose a compact delete action for saved
completed family walks, with explicit confirmation. Demo records and active walks
are excluded. Deleted walks leave real history/statistics/routine assignment.
Only the recorder sees Deleted history and can restore, preserving the same walk
and its saved route/waste rather than creating a replacement. Restoration does
not authorize another person's note/event corrections.

The approved family-delete permission is NOT yet installed on hosted Supabase:
20 November read-only function inspection still requires recorder identity.
20261120155307_shared_walk_history_deletion.sql is proposed/unapplied; it permits
current-member deletion while preserving author-only restoration, active-walk
protection and outsider/former-member/anonymous denial. Coordinate with Laura
before application. Do not pretend that exposing a button changes server rights.

Waste/tracking/deleted-owner-preview migrations are installed under different
hosted timestamps; see walks.md. Do not rerun them. Deleted-route SELECT remains
limited to the author; broadening delete must not expose ongoing/deleted GPS.

Tests use isolated PostgreSQL roles and cover accepted/rejected recording,
idempotency, privacy, family deletion, author restore and membership revocation.
No real activities were deleted as validation and no physical-phone result is
claimed. Current release status is in carol-walks-team-sync.md.
