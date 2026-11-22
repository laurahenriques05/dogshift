import { isRecentWalk, memberWalkTitle } from './retention'
import { useWalkMembers } from './useWalkMembers'
import { WalkDetailsEditor } from './WalkDetailsEditor'
import { WalkNoteHistory } from './WalkNoteHistory'
import { WalkNotes } from './WalkNotes'
import { WalkTimeline } from './WalkTimeline'
import { walkUsesGps } from './waste'
import { WalkWastePanel } from './WalkWastePanel'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button, Notice, PageTitle, errorMessage } from '../../components/ui'
import { db } from '../../lib/supabase/client'
import type { Walk, WalkPoint } from '../../lib/supabase/database.types'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { getPoints } from './api'
import { duration } from './gps'
import { RouteMap } from './RouteMap'
import { useWalks } from './WalkProvider'
import { findDemoWalk } from './demo'
import { WalkStats } from './WalkActivityCard'
export function WalkDetailPage(){
 const {walkId}=useParams()
 useEffect(()=>{window.scrollTo(0,0)},[walkId])
 const demo=findDemoWalk(walkId)
 if(demo)return <Navigate to="/walks?view=history" replace/>
 return <SavedWalkDetailPage/>
}
function SavedWalkDetailPage(){
 const {walkId}=useParams()
 const {session}=useAuth(),{household}=useHousehold(),{reload,now}=useWalks()
 const [timelineRevision,setTimelineRevision]=useState(0)
 const [gpsEnabled,setGpsEnabled]=useState(true)
 const [walk,setWalk]=useState<Walk|null>(null),[points,setPoints]=useState<WalkPoint[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[editing,setEditing]=useState(false)
 useEffect(()=>{let live=true;setLoading(true);setError('');setWalk(null);setPoints([]);setEditing(false)
  void(async()=>{try{const result=await db().from('walks').select('*').eq('id',walkId!).eq('household_id',household!.id).single();if(result.error)throw result.error;if(!live)return;if(result.data.ended_at&&!isRecentWalk(result.data)){throw new Error("This walk is outside the 7-day history.")}setWalk(result.data);if(result.data.ended_at&&!result.data.deleted_at){const enabled=await walkUsesGps(result.data.id);const route=enabled?await getPoints(result.data.id):[];if(live){setGpsEnabled(enabled);setPoints(route)}}}catch(e){if(live)setError(`Walk unavailable. ${errorMessage(e)}`)}finally{if(live)setLoading(false)}})()
  return()=>{live=false}
 },[walkId,household!.id])
 useEffect(()=>{if(walk?.ended_at&&!isRecentWalk(walk,now)){setWalk(null);setPoints([]);setError('This walk is outside the 7-day history.')}},[walk,now])
 const names=useWalkMembers(household!.id)
 const own=walk?.walker_id===session!.user.id,seconds=walk?duration(walk):0
 return <div className="walk-page"><Link to="/walks">← Back</Link><PageTitle eyebrow="YOUR WALKING DIARY" title="Walk summary"/>{error&&<Notice error>{error}</Notice>}{loading?<p role="status">Loading walk…</p>:walk&&<section className="card walk-summary-card"><h2>{memberWalkTitle(walk.walker_id,names)}</h2><p>{new Date(walk.started_at).toLocaleString()}</p>{walk.deleted_at?<div className="walk-deleted-state"><Notice>This walk is deleted and excluded from family history and summaries.</Notice></div>:!walk.ended_at?<><Notice>This walk is still in progress. Only the walker can access its ongoing route.</Notice><Link to="/walks">Open active walk</Link></>:<><>{gpsEnabled?<WalkStats meters={walk.distance_m} seconds={seconds}/>:<div className="walk-metrics"><div><strong>{Math.floor(seconds/60)} min {Math.floor(seconds%60)} s</strong><span>Time-only walk · No GPS route recorded</span></div></div>}</><p>Finishing Time: {new Date(walk.ended_at).toLocaleString()}{walk.end_reason==='stationary'?' · Automatically ended after the stationary warning.':''}</p>{gpsEnabled&&<RouteMap points={points}/>}<WalkWastePanel key={walk.id} walkId={walk.id} own={own} finished onRecorded={()=>setTimelineRevision(value=>value+1)}/><details className="walk-completed-timeline" open={timelineRevision>0}><summary>Walk Timeline</summary><WalkTimeline walk={walk} points={gpsEnabled?points:[]} timezone={household!.timezone} revision={timelineRevision} heading={false}/></details>{own?<WalkNotes key={`note-${walk.id}`} walkId={walk.id} user={session!.user.id} notes={walk.notes} timezone={household!.timezone} hideActions={editing} action={!editing?<Button className="secondary" onClick={()=>setEditing(true)}>Edit timeline and notes</Button>:undefined} onSaved={notes=>{setWalk(previous=>previous?{...previous,notes}:previous);void reload()}}/>:<WalkNoteHistory walkId={walk.id} user={session!.user.id} legacy={walk.notes} timezone={household!.timezone}/>}{own&&<>{editing?<WalkDetailsEditor walk={walk} points={points} onCancel={()=>setEditing(false)} onSaved={async updated=>{setWalk(updated);setEditing(false);setTimelineRevision(value=>value+1);await reload()}}/>:null}</>}</>}</section>}</div>
}
