import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../../lib/supabase/client'
import type { Walk } from '../../../lib/supabase/database.types'
import { errorMessage } from '../../../components/ui'
import { getPoints, getWalks } from '../api'
import { duration, type Point } from '../gps'
import { isNetworkFailure } from '../networkFailure'
import { recordingBreaksAvailable } from '../recordingCapabilities'
import { noteDraftKey, parseNoteDraft, type NoteDraft } from '../noteDraft'
import { queueNote, syncNotesBeforeFinish } from '../noteJournal'
import { startWalkWithWaste, walkUsesGps, type WasteMode } from '../waste'
import { WalkContext, type WalkContextValue } from '../walkContext'
import { flushNativePoints, mergeRoute, scopedRecording, walkRecorder, type NativeRecording, type Snapshot } from './bridge'

// The native file is the durable source of pending fixes. JS only uploads while
// available; it never fabricates fixes or needs to stay alive to collect them.
export function NativeWalkTracker({user,household,dog,children}:{user:string;household:string;dog:string;children:ReactNode}) {
 const scope=useRef({user,household}).current
 const [walks,setWalks]=useState<Walk[]>([]),[ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now())
 const [recording,setRecording]=useState<NativeRecording|null>(null),[points,setPoints]=useState<Point[]>([]),[recovered,setRecovered]=useState(false)
 const current=useRef<NativeRecording|null>(null),active=useRef<Walk|null>(null),savedPoints=useRef<Point[]>([])
 const alive=useRef(true),operation=useRef(false),syncing=useRef<Promise<void>|null>(null),refreshing=useRef(false)
 const apply=useCallback((snapshot:Snapshot)=>{
  const session=scopedRecording(snapshot,scope)
  current.current=session
  if(alive.current){setRecording(session);setPoints(mergeRoute(savedPoints.current,session?.points??[]))}
  return session
 },[scope])
 const upsert=useCallback((walk:Walk)=>{if(alive.current)setWalks(old=>[walk,...old.filter(w=>w.id!==walk.id)].sort((a,b)=>b.started_at.localeCompare(a.started_at)))},[])
 const refresh=useCallback(async()=>{
  if(refreshing.current)return
  refreshing.current=true
  try{apply(await walkRecorder.snapshot(scope))}catch(e){if(alive.current)setError(errorMessage(e))}finally{refreshing.current=false}
 },[scope,apply])
 const sync=useCallback(async()=>{
  if(syncing.current)return syncing.current
  const job=(async()=>{
   if(!navigator.onLine)return
   const s=apply(await walkRecorder.snapshot(scope));if(!s)return
   const bound={...scope,walk:s.walk}
   try{
    await flushNativePoints(walkRecorder,bound,async batch=>{
     const result=await db().rpc('append_walk_points',{p_walk:s.walk,p_points:batch});if(result.error)throw result.error
    },batch=>{savedPoints.current=mergeRoute(savedPoints.current,batch)})
    const latest=apply(await walkRecorder.snapshot(bound))
    if(latest?.ending){
     let note:NoteDraft|null=null
     try{note=parseNoteDraft(localStorage.getItem(noteDraftKey(user,s.walk)))}catch{/* Existing note journal remains authoritative. */}
     if(note&&note.text.trim()&&note.text.trim()!==note.expected){queueNote(user,{id:s.walk,walk_id:s.walk,text:note.text,recorded_at:latest.ending.at});localStorage.removeItem(noteDraftKey(user,s.walk))}
     await syncNotesBeforeFinish(user,s.walk)
     const args={p_walk:s.walk,p_ended_at:latest.ending.at,p_reason:latest.ending.reason}
     const result=latest.pauses.length?await (db() as unknown as SupabaseClient).rpc('finish_walk_with_pauses',{...args,p_pauses:latest.pauses}):await db().rpc('finish_walk',args)
     if(result.error)throw result.error
     // Only erase the local recording after the authenticated server confirms finish.
     apply(await walkRecorder.clear(bound));active.current=null;savedPoints.current=[];setPoints([]);upsert(result.data)
    }
   }catch(e){
    if(isNetworkFailure(e))apply(await walkRecorder.interrupt(bound))
    throw e
   }
  })()
  syncing.current=job
  try{await job}finally{syncing.current=null}
 },[scope,apply,user,upsert])
 const reload=useCallback(async()=>{
  if(operation.current||syncing.current)return
  try{
   const data=await getWalks(household);if(!alive.current)return
   setWalks(data)
   const own=data.find(w=>w.walker_id===user&&!w.ended_at&&!w.deleted_at)
   const local=scopedRecording(await walkRecorder.snapshot(scope),scope)
   if(!alive.current)return
   if(local&&(!own||local.walk!==own.id)){
    // Do not silently discard unsaved points after another device ends a walk.
    if(local.ending&&data.some(w=>w.id===local.walk&&w.ended_at)&&!local.points.length){apply(await walkRecorder.clear({...scope,walk:local.walk}))}
    else {await walkRecorder.suspend(scope);throw new Error('A private recording needs saving on this device. Its server walk is unavailable or was ended elsewhere. Do not reinstall or start another walk.')}
   }
   active.current=own??null
   if(own){
    const gps=await walkUsesGps(own.id)
    savedPoints.current=gps?await getPoints(own.id):[]
    if(!alive.current)return
    const tail=savedPoints.current.at(-1)
    const snapshot=local?{session:local}:await walkRecorder.prepare({...scope,walk:own.id,startedAt:own.started_at,gps,nextSeq:(tail?.seq??-1)+1,...(tail?{lastPoint:{...tail,segment_start:tail.segment_start??false}}:{})})
    apply(snapshot);setRecovered(snapshot.session?.state!=='recording')
   }else{savedPoints.current=[];apply({session:null})}
   setReady(true);setError('')
  }catch(e){if(alive.current)setError(errorMessage(e))}finally{if(alive.current)setLoading(false)}
 },[scope,user,household,apply])
 useEffect(()=>{
  alive.current=true;void reload()
  let listener:{remove:()=>Promise<void>}|undefined
  void walkRecorder.addListener('changed',()=>{if(alive.current)void refresh()}).then(handle=>{if(alive.current)listener=handle;else void handle.remove()})
  const tick=setInterval(()=>{if(alive.current){setNow(Date.now());void refresh();void sync().catch(e=>{if(alive.current)setError(errorMessage(e))})}},5000)
  const foreground=()=>{if(!document.hidden){setNow(Date.now());void refresh();void sync().then(()=>reload()).catch(e=>{if(alive.current)setError(errorMessage(e))})}}
  const offline=()=>{if(current.current)void walkRecorder.interrupt(scope).then(apply).catch(e=>{if(alive.current)setError(errorMessage(e))})}
  document.addEventListener('visibilitychange',foreground);window.addEventListener('offline',offline)
  return()=>{alive.current=false;clearInterval(tick);void listener?.remove();document.removeEventListener('visibilitychange',foreground);window.removeEventListener('offline',offline);void walkRecorder.suspend(scope).catch(()=>{})}
 },[scope,reload,refresh,sync,apply])
 async function perform(action:()=>Promise<void>){
  if(operation.current)return
  operation.current=true;setBusy(true);setError('')
  try{if(syncing.current)await syncing.current;if(!alive.current)return;await action()}catch(e){if(alive.current)setError(errorMessage(e))}finally{operation.current=false;if(alive.current)setBusy(false)}
 }
 async function resumeRecording(reconnect=false){
  const s=apply(await walkRecorder.snapshot(scope));if(!s||s.ending)return
  const server=await getWalks(household)
  if(!server.some(w=>w.id===s.walk&&w.walker_id===user&&!w.ended_at&&!w.deleted_at))throw new Error('This walk is no longer active. Reload before continuing.')
  if(s.state==='connectionLost'&&!reconnect)throw new Error('Choose Reconnect to verify and resume this walk.')
  await sync()
  if(!alive.current)return
  if(s.pauses.length||s.points.length||savedPoints.current.length)if(!await recordingBreaksAvailable())throw new Error('GPS segments are not ready on the server. Keep this recording and retry after setup.')
  if(!alive.current)return
  apply(await walkRecorder.start({...scope,walk:s.walk}));setRecovered(false)
 }
 async function start(mode:WasteMode='off',gps=true,taskOccurrence?:string){await perform(async()=>{
  const local=scopedRecording(await walkRecorder.snapshot(scope),scope)
  if(local)throw new Error('Finish saving the existing recording before starting another walk.')
  if(gps&&!await recordingBreaksAvailable())throw new Error('GPS segments are not ready on the server. Retry after setup.')
  const walk=await startWalkWithWaste(dog,mode,gps,taskOccurrence)
  if(!alive.current)return
  active.current=walk;savedPoints.current=gps?await getPoints(walk.id):[];upsert(walk)
  if(!alive.current)return
  const tail=savedPoints.current.at(-1)
  apply(await walkRecorder.prepare({...scope,walk:walk.id,startedAt:walk.started_at,gps,nextSeq:(tail?.seq??-1)+1,...(tail?{lastPoint:{...tail,segment_start:tail.segment_start??false}}:{})}));setReady(true)
  await resumeRecording()
 })}
 async function pause(){await perform(async()=>{
  if(!await recordingBreaksAvailable())throw new Error('Pause is not ready on the server. GPS remains active.')
  if(!alive.current)return
  apply(await walkRecorder.pause(scope));await sync()
 })}
 async function finish(note?:NoteDraft){await perform(async()=>{
  const s=apply(await walkRecorder.snapshot(scope));if(!s)return
  if(note)localStorage.setItem(noteDraftKey(user,s.walk),JSON.stringify(note))
  apply(await walkRecorder.finish(scope));await sync()
 })}
 async function reconnect(){let success=false;await perform(async()=>{
  const s=apply(await walkRecorder.snapshot(scope));if(!s)return
  if(s.ending){await sync();success=true;return}
  if(s.state==='paused'){await getWalks(household);await sync();success=true;return}
  await resumeRecording(true);success=true
 });return success}
 const pending=recording?.points.length??0,ending=!!recording?.ending,paused=recording?.state==='paused',gps=recording?.gps??true
 const tracking=recording?.state==='recording'&&gps
 const value:WalkContextValue={walks,ready,loading,error:error||recording?.error||'',busy,tracking,gpsEnabled:gps,points,pending,ending,now,warning:recording?.warning??null,autoEnd:recording?.autoEnd??true,
  gpsMessage:!recording?'GPS is not recording.':!gps?'Time-only walk. GPS is not used.':ending?'GPS stopped. Return online to save this walk.':paused?'Walk paused.':recording.state==='connectionLost'?'Connection lost. Reconnect to resume this walk.':tracking?'Recording your route. Unsynced points stay on this iPhone.':'GPS stopped. Resume explicitly to record again.',
  paused,quality:recording?.state==='denied'?'denied':tracking&&points.length?'good':'waiting',accuracy:points.at(-1)?.accuracy??null,saved:savedPoints.current.length>0,recovered,connectionFailed:recording?.state==='connectionLost',elapsedSeconds:active.current?duration(active.current,recording?.ending?Date.parse(recording.ending.at):now,recording?.pauses):0,
  start,pause,resume:()=>perform(()=>resumeRecording()),finish,reconnect,reload,sync,keepWalking:()=>{void perform(async()=>{apply(await walkRecorder.keepWalking(scope))})},setAutoEnd:enabled=>{void perform(async()=>{apply(await walkRecorder.setAutoEnd({...scope,enabled}))})}}
 return <WalkContext.Provider value={value}>{children}</WalkContext.Provider>
}
