import { isNetworkFailure } from './networkFailure'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
export type JournalNote={id:string;walk_id:string;text:string;recorded_at:string;pending?:boolean}
const client=()=>db() as unknown as SupabaseClient
export const journalKey=(user:string,walk:string)=>`pawshare.walk-journal.v1.${user}.${walk}`
export function parseJournal(raw:string|null,walk:string):JournalNote[]{
 try{const data=JSON.parse(raw??'[]');return Array.isArray(data)?data.filter(note=>typeof note.id==='string'&&note.walk_id===walk&&typeof note.text==='string'&&note.text.trim()&&note.text.length<=2000&&Number.isFinite(Date.parse(note.recorded_at))).map(note=>({...note,pending:true})):[]}catch{return []}
}
export function pendingNotes(user:string,walk:string){return parseJournal(localStorage.getItem(journalKey(user,walk)),walk)}
export function queueNote(user:string,note:JournalNote){const notes=pendingNotes(user,note.walk_id);if(!notes.some(item=>item.id===note.id))notes.push({...note,pending:true});localStorage.setItem(journalKey(user,note.walk_id),JSON.stringify(notes));window.dispatchEvent(new Event('pawshare:walk-notes'));return notes}
export async function syncNotes(user:string,walk:string){
 for(const note of pendingNotes(user,walk)){
  const result=await client().rpc('append_walk_note',{p_id:note.id,p_walk:walk,p_text:note.text,p_recorded_at:note.recorded_at})
  if(result.error)throw result.error
  const remaining=pendingNotes(user,walk).filter(item=>item.id!==note.id);localStorage.setItem(journalKey(user,walk),JSON.stringify(remaining))
 }
 window.dispatchEvent(new Event('pawshare:walk-notes'))
}
export async function loadJournal(walk:string):Promise<JournalNote[]>{
 const notes:JournalNote[]=[]
 for(let offset=0;;offset+=1000){const result=await client().from('walk_note_entries').select('id,walk_id,text,recorded_at').eq('walk_id',walk).order('recorded_at').order('id').range(offset,offset+999);if(result.error)throw result.error;notes.push(...result.data);if(result.data.length<1000)return notes}
}
export function mergeJournal(saved:JournalNote[],pending:JournalNote[]){return [...new Map([...pending,...saved].map(note=>[note.id,note])).values()].sort((a,b)=>a.recorded_at.localeCompare(b.recorded_at)||a.id.localeCompare(b.id))}
export function schemaMissing(error:unknown){const value=error as {code?:string;message?:string};return ['PGRST202','PGRST205','42883','42703','42P01'].includes(value?.code??'')||/schema cache|does not exist/i.test(value?.message??'')}

export async function syncNotesBeforeFinish(user:string,walk:string){try{await syncNotes(user,walk);return true}catch(error){if(isNetworkFailure(error))throw error;return false}}
