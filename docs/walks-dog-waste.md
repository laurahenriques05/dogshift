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

## Retention and privacy

No manual delete/restore UI or Deleted/Demo history remains. The installed retention
job removes expired completed walks and their waste/settings/notes/GPS after
168 hours, independent of recorder; active walks are preserved. Minimal private
linked-Task completion receipts remain, not archived walk contents. Earlier
family-deletion RPC proposals are superseded and must not be installed for this
flow. Source/hosted mapping and actual deletion evidence are in team sync.

Isolated SQL tests cover accepted/rejected waste recording, idempotency, recorder
privacy, retention cascades and active-walk preservation. Physical-phone recording
and populated multi-user acceptance remain separate checks. Do not rerun installed
waste/tracking migrations under their differing source timestamps.
