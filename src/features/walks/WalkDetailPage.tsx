import { X } from 'lucide-react'
import { RestoreWalkDialog } from './RestoreWalkDialog'
import { WalkNoteHistory } from './WalkNoteHistory'
import { WalkNotes } from './WalkNotes'
import { WalkTimeline } from './WalkTimeline'
import { walkUsesGps } from './waste'
import { WalkWastePanel } from './WalkWastePanel'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button, Field, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { Walk, WalkPoint } from '../../lib/supabase/database.types'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { getPoints } from './api'
import { duration } from './gps'
import { RouteMap } from './RouteMap'
import { useWalks } from './WalkProvider'
import { findDemoWalk } from './demo'
import { DemoWalkDetail } from './DemoWalks'
import { WalkStats } from './WalkActivityCard'
function localInput(iso:string){const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,23)}
export function WalkDetailPage(){
 const {walkId}=useParams()
 useEffect(()=>{window.scrollTo(0,0)},[walkId])
 const demo=findDemoWalk(walkId)
 if(demo&&walkId!==demo.id)return <Navigate to={`/walks/${demo.id}`} replace/>
 return demo?<DemoWalkDetail key={demo.id} walk={demo}/>:<SavedWalkDetailPage/>
}
function SavedWalkDetailPage(){
 const {walkId}=useParams(),{session}=useAuth(),{household}=useHousehold(),{reload}=useWalks()
 const [timelineRevision,setTimelineRevision]=useState(0)
 const [gpsEnabled,setGpsEnabled]=useState(true)
 const [walk,setWalk]=useState<Walk|null>(null),[points,setPoints]=useState<WalkPoint[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[remove,setRemove]=useState(false)
 useEffect(()=>{let live=true;setLoading(true);setError('');setWalk(null);setPoints([]);setEditing(false);setRemove(false)
  void(async()=>{try{const result=await db().from('walks').select('*').eq('id',walkId!).eq('household_id',household!.id).single();if(result.error)throw result.error;if(!live)return;setWalk(result.data);if(result.data.ended_at&&!result.data.deleted_at){const enabled=await walkUsesGps(result.data.id);const route=enabled?await getPoints(result.data.id):[];if(live){setGpsEnabled(enabled);setPoints(route)}}}catch(e){if(live)setError(`Walk unavailable. ${errorMessage(e)}`)}finally{if(live)setLoading(false)}})()
  return()=>{live=false}
 },[walkId,household!.id])
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!walk)return;const form=new FormData(event.currentTarget);setBusy(true);setError('')
  try{const start=new Date(String(form.get('start'))),end=new Date(String(form.get('end')));if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start||end.getTime()>Date.now()+30000)throw new Error('Choose valid start and end times, in the past, with end after start.')
   const result=await db().rpc('correct_walk',{p_walk:walk.id,p_started_at:start.toISOString(),p_ended_at:end.toISOString(),p_notes:String(form.get('notes')||'')});if(result.error)throw result.error;setWalk(result.data);setEditing(false);await reload()
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 async function deleted(value:boolean){if(!walk)return;setBusy(true);setError('');try{const result=await db().rpc('set_walk_deleted',{p_walk:walk.id,p_deleted:value});if(result.error)throw result.error;const refreshed=await db().from('walks').select('*').eq('id',walk.id).single();if(refreshed.error)throw refreshed.error;setWalk(refreshed.data);setRemove(false);if(!value)setPoints(await getPoints(walk.id));else setPoints([]);await reload()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 const own=walk?.walker_id===session!.user.id,seconds=walk?duration(walk):0
 return <div className="walk-page"><Link to="/walks">← All walks</Link><PageTitle eyebrow="YOUR WALKING DIARY" title="Walk summary"/>{error&&<Notice error>{error}</Notice>}{loading?<p role="status">Loading walk…</p>:walk&&<section className="card walk-summary-card">{own&&walk.ended_at&&!walk.deleted_at&&<button type="button" className="walk-delete-icon" aria-label="Delete walk" onClick={()=>setRemove(true)}><X size={15} aria-hidden="true"/></button>}<h2>{new Date(walk.started_at).toLocaleString()}</h2>{walk.deleted_at?<><Notice>This walk is deleted and excluded from family history and summaries.</Notice>{own&&<Button disabled={busy} onClick={()=>void deleted(false)}>Restore walk</Button>}</>:!walk.ended_at?<><Notice>This walk is still in progress. Only the walker can access its ongoing route.</Notice><Link to="/walks">Open active walk</Link></>:<><>{gpsEnabled?<WalkStats meters={walk.distance_m} seconds={seconds}/>:<div className="walk-metrics"><div><strong>{Math.floor(seconds/60)} min {Math.floor(seconds%60)} s</strong><span>Time-only walk · No GPS route recorded</span></div></div>}</><p>Finished {new Date(walk.ended_at).toLocaleString()}{walk.end_reason==='stationary'?' · Automatically ended after the stationary warning.':''}</p>{gpsEnabled&&<RouteMap points={points}/>}<WalkWastePanel key={walk.id} walkId={walk.id} own={own} finished onRecorded={()=>setTimelineRevision(value=>value+1)}/><details className="walk-completed-timeline"><summary>Walk Timeline</summary><WalkTimeline walk={walk} points={gpsEnabled?points:[]} timezone={household!.timezone} revision={timelineRevision} heading={false}/></details>{own?<WalkNotes key={`note-${walk.id}`} walkId={walk.id} user={session!.user.id} notes={walk.notes} timezone={household!.timezone} action={!editing?<Button className="secondary" onClick={()=>setEditing(true)}>Edit timeline and notes</Button>:undefined} onSaved={notes=>{setWalk(previous=>previous?{...previous,notes}:previous);void reload()}}/>:<WalkNoteHistory walkId={walk.id} user={session!.user.id} legacy={walk.notes} timezone={household!.timezone}/>}{own&&<>{editing?<form className="form-stack" onSubmit={save}><h3>Correct this walk</h3><p>Times use this device’s time zone and must include every recorded GPS point. You can extend an incorrectly ended walk; its missing route cannot be reconstructed.</p><Field label="Started" type="datetime-local" name="start" step="0.001" required defaultValue={localInput(walk.started_at)}/><Field label="Finished" type="datetime-local" name="end" step="0.001" required defaultValue={localInput(walk.ended_at)}/><label htmlFor="walk-notes">Notes</label><textarea id="walk-notes" name="notes" maxLength={2000} rows={4} defaultValue={walk.notes}/><div className="walk-actions"><Button disabled={busy}>Save corrections</Button><Button type="button" className="secondary" onClick={()=>setEditing(false)}>Cancel</Button></div></form>:null}</>}</>}</section>}{remove&&walk&&<RestoreWalkDialog action="delete" walkId={walk.id} onCancel={()=>setRemove(false)} onRestored={async()=>{const result=await db().from('walks').select('*').eq('id',walk.id).single();if(result.error)throw result.error;setWalk(result.data);setPoints([]);setRemove(false);await reload()}}/>}</div>
}
