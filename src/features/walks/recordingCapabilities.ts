import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
let available=false
/** Gate pause until the reviewed migration can preserve a real segment break. */
export async function recordingBreaksAvailable(){
 if(available)return true
 const client=db() as unknown as SupabaseClient
 const [points,timing]=await Promise.all([client.from('walk_points').select('segment_start').limit(0),client.from('walks').select('pause_intervals').limit(0)])
 available=!points.error&&!timing.error
 return available
}
