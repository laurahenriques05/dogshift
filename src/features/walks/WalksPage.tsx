import { WalkNfcConfirmation } from './WalkNfcConfirmation'
import { nfcWalkPreview } from './nfcPreview'
import { WalkHistoryOverview } from './WalkHistoryOverview'
import { useCareTask } from '../tasks/care'
import { StationaryWalkDialog } from './StationaryWalkDialog'
import { WalkTagSetup } from './WalkTagSetup'
import { WalkDailyOverview } from './WalkDailyOverview'
import { useDailyWalkRoutine } from './useDailyWalkRoutine'
import { TodaysWalks } from './TodaysWalks'
import { WalkFinishSummary } from './WalkFinishSummary'
import type { NoteDraft } from './noteDraft'
import { WalkConnectionAlert } from './WalkConnectionAlert'
import { WalkNotes } from './WalkNotes'
import { WalkRecordingStatus } from './WalkRecordingStatus'
import { WalkTimeline } from './WalkTimeline'
import { WalkWastePanel } from './WalkWastePanel'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Footprints, Pause, Play, Clock3, MapPin, Gauge } from 'lucide-react'
import { Button, Notice, PageTitle, isSchemaUnavailable } from '../../components/ui'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { useWalks } from './WalkProvider'
import { paceLabel, routeDistance, timeLabel } from './gps'
import { RouteMap } from './RouteMap'
import { clearWalkStart, pendingWalkStart, pendingWalkHousehold, collarMatchesHousehold } from './nfc'
import { recentWalkHistory } from './retention'
import { useWalkMembers } from './useWalkMembers'
import { WalkHistoryPage } from './WalkHistoryPage'
import { StartWalkDialog } from './StartWalkDialog'

export function WalksPage() {
 const {session}=useAuth(),{household,dog}=useHousehold(),data=useWalks(),navigate=useNavigate()
 const [search,setSearch]=useSearchParams(),[confirm,setConfirm]=useState<'nfc'|'start'|'end'|null>(null)
 const taskId=search.get('task'),care=useCareTask(taskId,household!.id,'walk')
 const [noteDraft,setNoteDraft]=useState<{walk:string;draft:NoteDraft}|null>(null)
 const [timelineRevision,setTimelineRevision]=useState(0)
 const [routineEditRequest,setRoutineEditRequest]=useState(0)
 const nfcSection=useRef<HTMLDetailsElement>(null)
 function openTagSetup(){const section=nfcSection.current;if(!section)return;section.open=true;section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});section.querySelector('summary')?.focus({preventScroll:true})}
 const [nfcError,setNfcError]=useState('')
 const [finishingWalk,setFinishingWalk]=useState<string|null>(null)
 const active=data.walks.find(w=>!w.ended_at&&!w.deleted_at),mine=active?.walker_id===session!.user.id
 const historyView=search.get('view')==='history'
 const routine=useDailyWalkRoutine({dog:dog!.id,walks:data.walks,zone:household!.timezone,now:data.now,enabled:!historyView&&!(active&&mine)})
 useEffect(()=>{window.scrollTo(0,0)},[historyView])
 const names=useWalkMembers(household!.id)
 const history=recentWalkHistory(data.walks,session!.user.id,names,data.now)
 const nfcPreview=nfcWalkPreview(routine,new Date(data.now),household!.timezone)
 const startBlocked=taskId&&(care.loading||!!care.error||!care.row||!!care.row.completed_at)?'Reload this task before starting.':active?(mine?'You already have an active walk. Close this window to return to it.':'Another family member is already walking your dog. Wait until they finish.'):''
 const meters=mine?routeDistance(data.points):0
 const dialog=useRef<HTMLDivElement>(null),previousFocus=useRef<HTMLElement|null>(null)
 useEffect(()=>{
  if(!finishingWalk)return
  const completed=data.walks.find(w=>w.id===finishingWalk&&w.ended_at&&!w.deleted_at)
  if(completed)navigate(`/walks/${completed.id}`)
 },[finishingWalk,data.walks,navigate])
 useEffect(()=>{if((search.get('action')==='start'||pendingWalkStart())&&data.ready&&(!taskId||care.row&&!care.row.completed_at)){const tagHousehold=search.get('household')??pendingWalkHousehold();clearWalkStart();if(!collarMatchesHousehold(tagHousehold,household!.id))setNfcError('This collar tag belongs to another family. Choose the matching family before starting.');else{setNfcError('');setConfirm('nfc')}const next=new URLSearchParams(search);next.delete('action');next.delete('view');next.delete('household');setSearch(next,{replace:true})}},[search,setSearch,data.ready,household,taskId,care.row])
 useEffect(()=>{
  if(confirm!=='end')return
  previousFocus.current=document.activeElement as HTMLElement
  dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
  return()=>previousFocus.current?.focus()
 },[confirm])
 if(historyView&&!(active&&mine))return <WalkHistoryPage areaScope={session!.user.id} history={history} timezone={household!.timezone} loading={data.loading} ready={data.ready} error={data.error} onRetry={()=>data.reload()}/>
 return <div className="walk-page">{!(active&&mine)&&<PageTitle eyebrow="A LITTLE FRESH AIR" title={`Out with ${dog!.name}.`}>Little adventures with {dog!.name}, shared with your family one walk at a time.</PageTitle>}
  {taskId&&!(active&&mine)&&<section className="card" aria-label="Walking task">{care.loading?<p role="status">Loading task…</p>:care.error?<><Notice error>{care.error}</Notice><Button onClick={care.reload}>Reload task</Button></>:<p>{care.row?.title} · {care.row?.completed_at?'Completed with a saved walk.':'Pending until this walk is ended and saved.'}</p>}<Link to="/tasks">Back to Tasks</Link></section>}
  {nfcError&&!(active&&mine)&&<Notice error>{nfcError}</Notice>}
  {data.error&&<Notice error>{isSchemaUnavailable(data.error)?'This recording is waiting to sync. Retry when the connection is ready.':data.error}<p><Button className="secondary" onClick={()=>{void data.reload();void data.sync()}}>Retry connection</Button></p></Notice>}
  {data.loading?<p role="status">Loading walks…</p>:!data.ready?<section className="card"><h2>Your walking diary is getting ready</h2><p>Walks and summaries will appear here once the connection is ready. GPS diagnostics and the walking lesson are available below.</p></section>:<>
   {!active&&<WalkDailyOverview routine={routine} walks={data.walks} zone={household!.timezone} dogName={dog!.name} busy={data.busy} onStart={()=>setConfirm('start')} onSetupTag={openTagSetup}/>}
   {active&&<section className="card walk-hero"><div className="walk-hero-header"><div className="walk-heading"><span className="icon-tile"><Footprints size={28} aria-hidden="true"/></span><div><p className="eyebrow">OUT EXPLORING</p><h2>{mine?'Your walk is in progress':'Your dog is on a walk'}</h2></div></div></div>
    <><p>Started {new Date(active.started_at).toLocaleString()}. {!mine&&'The summary becomes available after the walker finishes.'}</p>
     {mine&&<>{!data.gpsEnabled&&<div className="walk-live-metrics"><div><Clock3 size={20} aria-hidden="true"/><span><strong>{timeLabel(data.elapsedSeconds)}</strong><small>Elapsed time</small></span></div>{data.gpsEnabled&&<><div><MapPin size={20} aria-hidden="true"/><span><strong>{(meters/1000).toFixed(2)} km</strong><small>Distance</small></span></div><div><Gauge size={20} aria-hidden="true"/><span><strong>{paceLabel(meters,data.elapsedSeconds)}</strong><small>Average pace</small></span></div></>}</div>}
      <div className={`walk-live-layout${!data.gpsEnabled?' time-only':''}`}>
      {data.gpsEnabled&&<div className={`walk-live-map${data.points.length?' has-route':''}`}><RouteMap points={data.points} live/><div className="walk-live-metrics"><div><Clock3 size={20} aria-hidden="true"/><span><strong>{timeLabel(data.elapsedSeconds)}</strong><small>Elapsed time</small></span></div>{data.gpsEnabled&&<><div><MapPin size={20} aria-hidden="true"/><span><strong>{(meters/1000).toFixed(2)} km</strong><small>Distance</small></span></div><div><Gauge size={20} aria-hidden="true"/><span><strong>{paceLabel(meters,data.elapsedSeconds)}</strong><small>Average pace</small></span></div></>}</div></div>}
      <div className="walk-live-side"><WalkWastePanel key={active.id} walkId={active.id} own={mine} finished={false} onRecorded={()=>setTimelineRevision(value=>value+1)}/>
      <WalkTimeline walk={active} points={data.gpsEnabled?data.points:[]} timezone={household!.timezone} revision={timelineRevision}/>
      <WalkNotes key={`note-${active.id}`} walkId={active.id} user={session!.user.id} notes={active.notes} timezone={household!.timezone} disabled={data.ending} onDraftChange={draft=>setNoteDraft({walk:active.id,draft})} onSaved={()=>void data.reload()}/>
      <div className="walk-actions walk-recording-actions">{data.gpsEnabled&&(data.tracking?<Button className="secondary" disabled={data.busy||data.ending} onClick={()=>void data.pause()}><Pause size={18} aria-hidden="true"/>Pause GPS</Button>:<Button className="secondary" disabled={data.busy||data.ending} onClick={()=>void data.resume()}><Play size={18} aria-hidden="true"/>Resume GPS</Button>)}<Button className="walk-end-button" disabled={data.busy||data.ending} onClick={()=>{data.keepWalking();setConfirm('end')}}>End walk</Button></div>
      <WalkRecordingStatus gps={data.gpsEnabled} tracking={data.tracking} paused={data.paused} quality={data.quality} accuracy={data.accuracy} lastFix={data.points.length?Date.parse(data.points.at(-1)!.recorded_at):null} pending={data.pending} ending={data.ending} online={navigator.onLine} saved={data.saved} now={data.now} recovered={data.recovered}/>
      {data.ending&&<Notice><p role="status">Finishing your walk. Reconnect if saving is interrupted.</p></Notice>}
      </div></div>
     </>}
    </>
   </section>}
   {!(active&&mine)&&<>
   <TodaysWalks editRequest={routineEditRequest} routine={routine} user={session!.user.id} zone={household!.timezone}/>
   <WalkHistoryOverview history={history} timezone={household!.timezone} now={new Date(data.now)}/>
   </>}
  </>}
  {!(active&&mine)&&<details id="walk-nfc" ref={nfcSection} className="feeding-disclosure walk-nfc-section"><summary><span>NFC tag</span><small>Configure or replace the household walking tag</small></summary><div className="feeding-disclosure-body"><WalkTagSetup householdId={household!.id}/></div></details>}
  {active&&mine&&data.warning!==null&&!data.ending&&<StationaryWalkDialog dogName={dog!.name} busy={data.busy} onYes={data.keepWalking} onNo={()=>{setConfirm(null);setFinishingWalk(active.id);void data.finish(noteDraft?.walk===active.id?noteDraft.draft:undefined)}}/>}
  <WalkConnectionAlert active={!!active&&mine} failed={data.connectionFailed} onReconnect={()=>data.reconnect()}/>
  {confirm==='nfc'&&<WalkNfcConfirmation dogName={dog!.name} {...nfcPreview} loading={routine.loading} busy={data.busy} blocked={startBlocked} onClose={()=>setConfirm(null)} onChangeDetails={()=>{setConfirm(null);setRoutineEditRequest(value=>value+1)}} onConfirm={()=>{if(!startBlocked&&!data.busy)setConfirm('start')}}/>}
  {confirm==='start'&&<StartWalkDialog dogName={dog!.name} busy={data.busy} blocked={startBlocked} onCancel={()=>setConfirm(null)} onConfirm={(mode,trackGps)=>{setConfirm(null);void data.start(mode,trackGps,taskId||undefined)}}/>}
  {confirm==='end'&&active&&mine&&<div className="walk-dialog-backdrop"><div ref={dialog} className="card walk-dialog" role="dialog" aria-modal="true" aria-labelledby="walk-confirm-title" onKeyDown={e=>{if(e.key==='Escape')setConfirm(null);if(e.key==='Tab'){const buttons=dialog.current!.querySelectorAll<HTMLButtonElement>('button');if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus()}else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus()}}}}><h2 id="walk-confirm-title">Finish this walk?</h2><>{active&&mine&&<WalkFinishSummary timezone={household!.timezone} walk={active} user={session!.user.id} draft={noteDraft?.walk===active.id?noteDraft.draft:undefined}/>}</><div className="walk-actions"><Button className="secondary" onClick={()=>setConfirm(null)}>Cancel</Button><Button disabled={data.busy||!data.ready} onClick={()=>{setConfirm(null);if(active){setFinishingWalk(active.id);void data.finish(noteDraft?.walk===active.id?noteDraft.draft:undefined)}}}>Confirm end</Button></div></div></div>}
 </div>
}
