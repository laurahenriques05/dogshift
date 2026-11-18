import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '../../components/ui'
import { noteDraftKey, parseNoteDraft, saveWalkNote, type NoteDraft } from './noteDraft'
export function WalkNotes({walkId,user,notes,onSaved}:{walkId:string;user:string;notes:string;onSaved?:()=>void}){
 const key=noteDraftKey(user,walkId),[text,setText]=useState(notes),[expected,setExpected]=useState(notes),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[conflict,setConflict]=useState(false)
 const alive=useRef(true),locked=useRef(false)
 useEffect(()=>{alive.current=true;try{const draft=parseNoteDraft(localStorage.getItem(key));if(draft&&draft.text!==notes){setText(draft.text);setExpected(draft.expected);setStatus('Note recovered from this device.');setOpen(true)}else{setText(notes);setExpected(notes);if(draft)localStorage.removeItem(key)}}catch{setStatus('Device storage is unavailable. Save before closing.')}return()=>{alive.current=false}},[key,notes])
 function keep(value:string){setText(value);try{localStorage.setItem(key,JSON.stringify({text:value,expected} satisfies NoteDraft));setStatus('Draft kept on this device.')}catch{setStatus('Device storage is unavailable. Save before closing.')}}
 async function save(){
  if(locked.current)return;locked.current=true;setBusy(true);setStatus('Saving note…')
  try{const walk=await saveWalkNote(walkId,{text,expected});if(!alive.current)return;setText(walk.notes);setExpected(walk.notes);try{localStorage.removeItem(key)}catch{/* The server confirmed this note. */}setOpen(false);setConflict(false);setStatus('Note saved.');onSaved?.()}
  catch(error){if(alive.current){setConflict(!!error&&typeof error==='object'&&'code' in error&&error.code==='40001');let kept=false;try{kept=parseNoteDraft(localStorage.getItem(key))?.text===text}catch{/* The draft remains only in memory. */}setStatus(error&&typeof error==='object'&&'code' in error&&error.code==='40001'?'This note changed on another device. Reopen the walk before replacing it.':kept?'Your note is kept on this device. Try saving again when connected.':'Could not save the note. Keep this page open and retry.')}}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 return <section className="walk-note"><Button className="secondary walk-note-open" disabled={busy} onClick={()=>setOpen(value=>!value)}><Pencil size={19} aria-hidden="true"/>{text?'Edit note':'Add a note'}</Button>{open&&<div className="walk-note-editor"><textarea aria-label="Walk note" id={`note-${walkId}`} value={text} maxLength={2000} rows={3} disabled={busy} onChange={event=>keep(event.target.value)} placeholder="A little moment to remember…"/><Button disabled={busy} onClick={()=>void save()}>Save note</Button></div>}{!open&&text&&<p className="walk-notes">{text}</p>}{conflict&&<Button className="secondary" onClick={()=>{setText(notes);setExpected(notes);setConflict(false);setStatus('Saved note restored.');try{localStorage.removeItem(key)}catch{/* The visible saved note remains available. */}}}>Use saved note</Button>}{status&&<p className="walk-note-status" role="status">{status}</p>}</section>
}
