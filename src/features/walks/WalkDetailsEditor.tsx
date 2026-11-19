import { useEffect, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button, Field, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { Walk, WalkPoint } from '../../lib/supabase/database.types'
import { loadJournal, type JournalNote } from './noteJournal'
import { getWalkWaste } from './waste'
import { walkTimeline, type TimelineEntry } from './timelineEvents'
export function localWalkInput(iso:string){const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,23)}
export function WalkDetailsEditor({walk,points,onSaved,onCancel}:{walk:Walk;points:WalkPoint[];onSaved:(walk:Walk)=>Promise<void>;onCancel:()=>void}){
 const [data,setData]=useState<{notes:JournalNote[];events:TimelineEntry[]}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{let alive=true;setData(null);setError('');void Promise.all([loadJournal(walk.id),getWalkWaste(walk.id)]).then(([notes,waste])=>{if(alive)setData({notes,events:walkTimeline(walk,points,waste.mode,waste.events)})}).catch(e=>{if(alive)setError(errorMessage(e))});return()=>{alive=false}},[walk,points,retry])
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!data||busy)return
  const form=new FormData(event.currentTarget);setBusy(true);setError('')
  try{
   const instant=(name:string)=>{const time=new Date(String(form.get(name)));if(!Number.isFinite(time.getTime()))throw new Error('Choose a valid event time.');return time.toISOString()}
   const start=instant('start'),end=instant('end')
   const notes=data.notes.map(note=>({id:note.id,text:String(form.get(`note-${note.id}`)),recorded_at:instant(`note-time-${note.id}`)}))
   const events=data.events.map(entry=>({id:entry.id,label:String(form.get(`event-label-${entry.id}`)),at:entry.id==='start'?start:entry.id==='finish'?end:instant(`event-time-${entry.id}`)}))
   const result=await (db() as unknown as SupabaseClient).rpc('correct_walk_details',{p_walk:walk.id,p_revision:(walk as Walk&{edit_revision?:number}).edit_revision,p_start:start,p_end:end,p_legacy:walk.notes?String(form.get('legacy')):walk.notes,p_expected_notes:data.notes,p_notes:notes,p_events:events})
   if(result.error)throw result.error
   window.dispatchEvent(new Event('pawshare:walk-notes'))
   await onSaved(result.data as Walk)
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 const available=typeof (walk as Walk&{edit_revision?:number}).edit_revision==='number'
 if(!available)return <div role="status"><p>Timeline editing is waiting for the database update. Your saved walk is unchanged.</p><Button className="secondary" onClick={onCancel}>Cancel</Button></div>
 return <form className="form-stack walk-details-editor" onSubmit={save}>
  <p className="muted">Times shown in this device’s time zone.</p>
  {error&&<p role="alert">{error}</p>}
  {!data?<><p role="status">{error?'Could not load saved events and notes.':'Loading saved events and notes…'}</p>{error&&<Button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Retry</Button>}</>:<>
   <Field label="Starting Time" name="start" type="datetime-local" required step="0.001" disabled={busy} defaultValue={localWalkInput(walk.started_at)}/>
   <Field label="Finishing Time" name="end" type="datetime-local" required step="0.001" disabled={busy} defaultValue={localWalkInput(walk.ended_at!)}/>
   <div className="walk-edit-events">{data.events.map(entry=><fieldset key={entry.id} disabled={busy}><legend>{entry.id==='start'?'Start':entry.id==='finish'?'Finish':entry.label}</legend><Field label="Event text" name={`event-label-${entry.id}`} defaultValue={entry.label} required maxLength={200}/>{!['start','finish'].includes(entry.id)&&<Field label="Event time" name={`event-time-${entry.id}`} type="datetime-local" required step="0.001" defaultValue={localWalkInput(entry.at)}/>}</fieldset>)}</div>
   {walk.notes&&<label>Existing walk note<textarea name="legacy" defaultValue={walk.notes} maxLength={2000} disabled={busy}/></label>}
   {data.notes.map((note,index)=><fieldset key={note.id} disabled={busy}><legend>Recorded note {index+1}</legend><label>Note text<textarea name={`note-${note.id}`} defaultValue={note.text} maxLength={2000} required/></label><Field label="Note time" name={`note-time-${note.id}`} type="datetime-local" required step="0.001" defaultValue={localWalkInput(note.recorded_at)}/></fieldset>)}
  </>}
  <div className="walk-actions"><Button disabled={busy||!data}>{busy?'Saving…':'Save'}</Button><Button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</Button></div>
 </form>
}
