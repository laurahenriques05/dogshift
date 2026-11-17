import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
import type { Walk } from '../../lib/supabase/database.types'
export type WasteMode = 'off' | 'during' | 'end'
export type WasteKind = 'pee' | 'poop'
export type WasteEvent = { id: string; walk_id: string; kind: WasteKind; recorded_at: string }
// Feature-local schema until the migration and shared type update are coordinated.
const client = () => db() as unknown as SupabaseClient
export async function startWalkWithWaste(dog: string, mode: WasteMode, trackGps = true): Promise<Walk> {
 const result = await client().rpc('start_walk_with_options', { p_dog: dog, p_mode: mode, p_track_gps: trackGps })
 if (result.error) throw result.error
 return result.data as Walk
}
export async function getWalkWaste(walk: string): Promise<{ mode: WasteMode | null; events: WasteEvent[] }> {
 const [settings, events] = await Promise.all([
  client().from('walk_waste_settings').select('record_mode').eq('walk_id', walk).maybeSingle(),
  client().from('walk_waste_events').select('id,walk_id,kind,recorded_at').eq('walk_id', walk).order('recorded_at'),
 ])
 if (settings.error) throw settings.error
 if (events.error) throw events.error
 return { mode: settings.data?.record_mode ?? null, events: events.data ?? [] }
}
export async function recordWaste(event: { id: string; walk_id: string; kind: WasteKind }): Promise<void> {
 const result = await client().rpc('record_walk_waste', { p_id: event.id, p_walk: event.walk_id, p_kind: event.kind })
 if (result.error) throw result.error
}
export function wasteCounts(events: Pick<WasteEvent, 'id' | 'kind'>[]) {
 const unique = [...new Map(events.map(e => [e.id, e])).values()]
 return { pee: unique.filter(e => e.kind === 'pee').length, poop: unique.filter(e => e.kind === 'poop').length }
}

export async function walkUsesGps(walk: string): Promise<boolean> {
 const result = await client().from('walk_waste_settings').select('track_gps').eq('walk_id', walk).maybeSingle()
 if (result.error) throw result.error
 return result.data?.track_gps ?? true
}
