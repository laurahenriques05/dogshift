import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
import type { Walk } from '../../lib/supabase/database.types'
export type NoteDraft={text:string;expected:string}
export const noteDraftKey=(user:string,walk:string)=>`pawshare.walk-note.v1.${user}.${walk}`
export function parseNoteDraft(raw:string|null):NoteDraft|null{
 try{const value=JSON.parse(raw||'null');return value&&typeof value.text==='string'&&value.text.length<=2000&&typeof value.expected==='string'&&value.expected.length<=2000?{text:value.text,expected:value.expected}:null}catch{return null}
}
export async function saveWalkNote(walk:string,draft:NoteDraft):Promise<Walk>{
 const result=await (db() as unknown as SupabaseClient).rpc('set_walk_note',{p_walk:walk,p_note:draft.text,p_expected:draft.expected})
 if(result.error)throw result.error
 return result.data as Walk
}
