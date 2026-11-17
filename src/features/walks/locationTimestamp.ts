// The reported Safari response is exactly the 1970→2001 epoch offset behind UTC.
const APPLE_EPOCH_OFFSET_MS = Date.UTC(2001, 0, 1)
/** Accept only a recent fix, including the observed Apple-epoch representation.
 * Never substitute receipt time: stale positions must remain stale.
 */
export function locationTimestamp(raw: number, receivedAt = Date.now()): number | null {
 if (!Number.isFinite(raw) || !Number.isFinite(receivedAt)) return null
 const recent = (value: number) => receivedAt - value >= -5000 && receivedAt - value <= 60000
 if (recent(raw)) return raw
 const corrected = raw + APPLE_EPOCH_OFFSET_MS
 return recent(corrected) ? corrected : null
}
