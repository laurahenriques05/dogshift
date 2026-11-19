import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '../../components/ui'
import { noteDraftKey, parseNoteDraft, type NoteDraft } from './noteDraft'
import { queueNote, syncNotes } from './noteJournal'
import { WalkNoteHistory } from './WalkNoteHistory'
export function WalkNotes({walkId,user,notes,onSaved,onDraftChange,action,disabled=false,timezone}:{walkId:string;user:string;notes:string;onSaved?:(notes:string)=>void;onDraftChange?:(draft:NoteDraft)=>void;action?:ReactNode;disabled?:boolean;timezone?:string}){
 const key=noteDraftKey(user,walkId),[text,setText]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const latest=useRef(onDraftChange);latest.current=onDraftChange
 const alive=useRef(true),locked=useRef(false)
 useEffect(()=>{latest.current?.({text,expected:notes})},[text,notes])
 useEffect(()=>{alive.current=true;try{const draft=parseNoteDraft(localStorage.getItem(key));if(draft&&draft.text!==draft.expected){setText(draft.text);setOpen(true)}}catch{setError('Device storage unavailable. Keep this page open.')}return()=>{alive.current=false}},[key])
 useEffect(()=>{const retry=()=>{void syncNotes(user,walkId).catch(()=>{})};retry();const timer=setInterval(()=>{if(navigator.onLine&&!document.hidden)retry()},15000);window.addEventListener('online',retry);return()=>{clearInterval(timer);window.removeEventListener('online',retry)}},[user,walkId])
 function keep(value:string){setText(value);setError('');try{localStorage.setItem(key,JSON.stringify({text:value,expected:notes}))}catch{setError('Device storage unavailable. Keep this page open.')}}
 async function save(){
  if(locked.current||!text.trim())return;locked.current=true;setBusy(true);setError('')
  let queued=false
  try{queueNote(user,{id:crypto.randomUUID(),walk_id:walkId,text:text.trim(),recorded_at:new Date().toISOString()});queued=true;localStorage.removeItem(key);setText('');setOpen(false);await syncNotes(user,walkId);onSaved?.(notes)}
  catch{if(alive.current&&!queued)setError('Could not save note. Retry.')}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 return <section className="walk-note"><div className="walk-note-actions"><Button className="secondary walk-note-open" disabled={busy||disabled} onClick={()=>setOpen(value=>!value)}><Pencil size={19} aria-hidden="true"/>Add a note</Button>{action}</div>{open&&<div className="walk-note-editor"><textarea aria-label="Walk note" value={text} maxLength={2000} rows={3} disabled={busy||disabled} onChange={event=>keep(event.target.value)} placeholder="A little moment to remember…"/><Button disabled={busy||disabled||!text.trim()} onClick={()=>void save()}>Save Note</Button></div>}{error&&<p className="walk-note-status" role="alert">{error}</p>}<WalkNoteHistory walkId={walkId} user={user} legacy={notes} timezone={timezone}/></section>
}
