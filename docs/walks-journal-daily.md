# Walk journal and manual outings

Read [routine rules](walks-routine-period-names.md) for current estimated-hours,
period grouping and automatic start assignment. Old count-only/finish-day rules
are not the current complete-routine behaviour.

Save Note appends a separate timestamped journal entry with a stable UUID and
resets the editor. Legacy walk.notes stays visible; new entries do not overwrite
it. Only the recorder/current member appends. Other members read after completion.
Retries are idempotent; conflicting IDs fail. Queued/draft notes are retained on
the original device where storage works and labelled pending until acknowledged.
Editor errors retain the draft and permit retry; no false cloud-save success.

Finish confirmation includes legacy notes, journal and the current draft. Durable
finish intent retains drafts; missing note support cannot silently discard them
or fabricate completion. Separate pending notes can retry after route completion.
Reconnect/visible periodic retries preserve existing queue semantics.

Manual circle selection records an attestation, not a GPS walk or a start time.
Only its author can undo it. Checks use stable slots and are distinct from real
walks; a manually recorded and later tracked physical outing may require Undo.
Shared checks refresh on focus/reconnect and periodically while visible. No second
Tasks/calendar/notification system is created.

Hosted journal/daily-plan and routine preferences are installed as 20261119172420
and 20261119172455, inspected on 20 November. Do not rerun their source files.
Strict estimate/slot-identity follow-ups remain proposed; see walks.md.

Isolated tests cover membership/author/privacy, duplicate IDs, pending queues,
manual checks, local-day boundaries and slot identity. Browser fixtures used
sample responses, not real hosted account writes. Phone validation is pending.
