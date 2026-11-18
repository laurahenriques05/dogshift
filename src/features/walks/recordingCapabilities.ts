import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
let available=false
/** Gate pause until the reviewed migration can preserve a real segment break. */
export async function recordingBreaksAvailable(){
 if(available)return true
 const result=await (db() as unknown as SupabaseClient).from('walk_points').select('segment_start').limit(0)
 available=!result.error
 return available
}
