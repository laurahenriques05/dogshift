import { RestoreWalkDialog } from './RestoreWalkDialog'
import { WalkWastePanel } from './WalkWastePanel'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Footprints } from 'lucide-react'
import { Button, Notice, PageTitle } from '../../components/ui'
import { useAuth } from '../auth/AuthProvider'
import { useHousehold } from '../household/HouseholdProvider'
import { useWalks } from './WalkProvider'
import { duration, paceLabel, routeDistance, timeLabel } from './gps'
import { RouteMap } from './RouteMap'
import { walkNotifications } from './notifications'
import { clearWalkStart, pendingWalkStart } from './nfc'
import { walkHistory, summarizeHistory, type HistoryPeriod } from './history'
import { kilometersLabel } from './mapGestures'
import { WalkActivityCard } from './WalkActivityCard'
import { WalkPeriodSelect } from './WalkPeriodSelect'
import { WalkSummaryChart } from './WalkSummaryChart'
import { WalkHistoryPage } from './WalkHistoryPage'
import { StartWalkDialog } from './StartWalkDialog'

export function WalksPage() {
 const {session}=useAuth(),{household,dog}=useHousehold(),data=useWalks(),navigate=useNavigate()
 const [search,setSearch]=useSearchParams(),[confirm,setConfirm]=useState<'start'|'end'|null>(null),[period,setPeriod]=useState<HistoryPeriod>('month')
 const [deleting, setDeleting] = useState<string | null>(null)
 const [showStatistics,setShowStatistics]=useState(false)
 const [notify,setNotify]=useState(''),[copied,setCopied]=useState('')
 const [finishingWalk,setFinishingWalk]=useState<string|null>(null)
 const active=data.walks.find(w=>!w.ended_at&&!w.deleted_at),mine=active?.walker_id===session!.user.id
 const historyView=search.get('view')==='history'
 useEffect(()=>{window.scrollTo(0,0)},[historyView])
 const history=walkHistory(data.walks,false,session!.user.id)
 const summaryNow=new Date(data.now)
 const summary=summarizeHistory(history,period,household!.timezone,summaryNow)
 const meters=mine?routeDistance(data.points):0
 const dialog=useRef<HTMLDivElement>(null),previousFocus=useRef<HTMLElement|null>(null)
 useEffect(()=>{
  if(!finishingWalk)return
  const completed=data.walks.find(w=>w.id===finishingWalk&&w.ended_at&&!w.deleted_at)
  if(completed)navigate(`/walks/${completed.id}`)
 },[finishingWalk,data.walks,navigate])
 useEffect(()=>{if((search.get('action')==='start'||pendingWalkStart())&&data.ready){clearWalkStart();setConfirm('start');const next=new URLSearchParams(search);next.delete('action');next.delete('view');setSearch(next,{replace:true})}},[search,setSearch,data.ready])
 useEffect(()=>{
  if(confirm!=='end')return
  previousFocus.current=document.activeElement as HTMLElement
  dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
  return()=>previousFocus.current?.focus()
 },[confirm])
 useEffect(()=>{
  if(!data.warning||!active)return
  walkNotifications.show(active.id,()=>navigate('/walks'))
  return()=>walkNotifications.cancel(active.id)
 },[data.warning,active?.id,navigate])
 async function notifications(){
  if(typeof Notification==='undefined'){setNotify('This browser does not support system notifications. The in-app warning remains available.');return}
  try {const permission=await Notification.requestPermission();setNotify(permission==='granted'?'Browser notifications enabled where supported. Keep the app visible for reliable GPS and the in-app warning.':'Notifications unavailable or denied. You can still use the in-app warning.')}catch{setNotify('System notifications need the shared mobile notification integration. Use the in-app warning for now.')}
 }
 if(historyView)return <WalkHistoryPage deletedHistory={walkHistory(data.walks,false,session!.user.id,true)} history={history} timezone={household!.timezone} loading={data.loading} ready={data.ready} error={data.error} onRetry={()=>data.reload()}/>
 return <div className="walk-page"><PageTitle eyebrow="A LITTLE FRESH AIR" title={`Out with ${dog!.name}.`}/>
  {data.error&&<Notice error>{data.error}<p><Button className="secondary" onClick={()=>{void data.reload();void data.sync()}}>Retry connection</Button></p></Notice>}
  {data.loading?<p role="status">Loading walks…</p>:!data.ready?<section className="card"><h2>Your walking diary is getting ready</h2><p>Walks and summaries will appear here once the connection is ready. GPS diagnostics and the walking lesson are available below.</p></section>:<>
   <section className="card walk-hero"><div className="walk-hero-header"><div className="walk-heading"><span className="icon-tile"><Footprints size={28} aria-hidden="true"/></span><div><p className="eyebrow">{active?'OUT EXPLORING':'READY WHEN YOU ARE'}</p><h2>{active?(mine?'Your walk is in progress':'Your dog is on a walk'):'A new adventure awaits'}</h2></div></div>{!active&&<Button disabled={data.busy} onClick={()=>setConfirm('start')}>Start walk</Button>}</div>
    {active?<><p>Started {new Date(active.started_at).toLocaleString()}. {mine?(data.gpsEnabled?'Your route stays private until you end the walk.':'Time-only walk. No GPS route is recorded.'):'The summary becomes available after the walker finishes.'}</p>
     {mine&&<><div className="walk-metrics"><div><strong>{timeLabel(duration(active,data.now))}</strong><span>Elapsed time</span></div>{data.gpsEnabled&&<><div><strong>{(meters/1000).toFixed(2)} km</strong><span>Recorded distance</span></div><div><strong>{paceLabel(meters,duration(active,data.now))}</strong><span>Average pace</span></div></>}</div>
      <WalkWastePanel key={active.id} walkId={active.id} own={mine} finished={false}/>
      <p role="status">{data.gpsMessage} {data.pending>0&&`${data.pending} GPS points waiting to sync.`}</p>
      {data.tracking&&data.points.length>0&&data.now-Date.parse(data.points.at(-1)!.recorded_at)>30000&&<Notice>GPS is interrupted. Distance may be incomplete. Missing GPS does not trigger automatic ending.</Notice>}
      {data.gpsEnabled&&<Notice>Keep the app visible and the screen unlocked for GPS. Refreshing stops recording: return here and press Resume GPS. Offline points are kept on this device until saved.</Notice>}
      <div className="walk-actions">{data.gpsEnabled&&!data.tracking&&!data.ending&&<Button disabled={data.busy} onClick={()=>void data.resume()}>Resume GPS</Button>}<Button className="secondary" disabled={data.busy||data.ending} onClick={()=>setConfirm('end')}>End walk</Button><Button className="secondary" disabled={data.busy} onClick={()=>void data.sync()}>Sync now</Button></div>
      {data.gpsEnabled&&<details><summary>Optional stationary reminder</summary><p>Experimental, foreground only: after 10 minutes within approximately 30 m, show a warning. After another 2 minutes of uninterrupted GPS, end at the current time. GPS accuracy must be ≤25 m. Movement, missing GPS, or hiding the app cancels the countdown.</p><label className="walk-check"><input type="checkbox" checked={data.autoEnd} onChange={e=>data.setAutoEnd(e.target.checked)}/>Enable reminder and automatic ending for this session</label><Button className="secondary" onClick={()=>void notifications()}>Enable browser notifications</Button>{notify&&<p role="status">{notify}</p>}</details>}
      {data.warning&&<Notice>Still walking? Ending in approximately {Math.max(0,Math.ceil((120000-(data.now-data.warning))/1000))} seconds if GPS stays available.<p><Button onClick={data.keepWalking}>Keep walking</Button></p></Notice>}
      {data.ending&&<Notice><p role="status">The walk is waiting to finish saving. Keep this device and retry when connected to save the completed summary.</p></Notice>}
      {data.gpsEnabled&&data.points.length>0&&<RouteMap points={data.points}/>}
     </>}
    </>:<><p className="walk-hero-description">Every walk has a story. Record the little moments along the way.</p></>}
   </section>
   <section className="card"><div className="walk-heading"><div><p className="eyebrow">LITTLE STEPS ADD UP</p><h2>Walking together</h2></div><WalkPeriodSelect label="Summary period" value={period} onChange={setPeriod}/></div><div className="walk-metrics"><div><strong>{summary.count}</strong><span>Completed walks</span></div><div><strong>{kilometersLabel(summary.meters)} km</strong><span>Recorded distance</span></div><div><strong>{timeLabel(summary.seconds)}</strong><span>Total time</span></div></div><div id="walk-statistics" hidden={!showStatistics}>{showStatistics&&<WalkSummaryChart history={history} period={period} timezone={household!.timezone} now={summaryNow}/>}</div><div className="walk-statistics-action"><button type="button" className="walk-statistics-toggle" aria-expanded={showStatistics} aria-controls="walk-statistics" onClick={()=>setShowStatistics(value=>!value)}>{showStatistics?'Hide statistics':'Show statistics'}</button></div></section>
   <section className="card"><div className="walk-heading walk-history-heading"><h2>Last Adventure</h2><Link className="walk-show-more" to="/walks?view=history">Show more</Link></div>{!history.length?<p className="walk-empty">Your first completed walk will appear here.</p>:<div className="walk-activity-list">{history.slice(0,1).map(w=><WalkActivityCard key={w.id} {...w} loadRoute={!w.demo} onDelete={w.own && !w.demo ? () => setDeleting(w.id) : undefined}/>)}</div>}</section>
  </>}
  <section className="card"><h2>A shortcut on the leash</h2><p>Tap the NFC tag on the leash to open PawShare. Your phone records the GPS route while you carry it on the walk. Configure the tag once with this link. It opens the Start Walk confirmation for the signed-in user’s selected family. Opening a link never starts a walk automatically.</p><code className="walk-url">{window.location.origin}/walks?action=start</code><p><Button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/walks?action=start`);setCopied('Link copied.')}catch{setCopied('Copy the link shown above manually.')}}}>Copy NFC link</Button></p>{copied&&<p role="status">{copied}</p>}<Link to="/walks/gps-test">Open GPS diagnostics</Link></section>
  {deleting&&<RestoreWalkDialog action="delete" walkId={deleting} onCancel={()=>setDeleting(null)} onRestored={async()=>{await data.reload();setDeleting(null)}}/>}
  {confirm==='start'&&<StartWalkDialog dogName={dog!.name} busy={data.busy} blocked={active?(mine?'You already have an active walk. Close this window and resume GPS.':'Another family member is already walking your dog. Wait until they finish.'):''} onCancel={()=>setConfirm(null)} onConfirm={(mode,trackGps)=>{setConfirm(null);void data.start(mode,trackGps)}}/>}
  {confirm==='end'&&<div className="walk-dialog-backdrop"><div ref={dialog} className="card walk-dialog" role="dialog" aria-modal="true" aria-labelledby="walk-confirm-title" onKeyDown={e=>{if(e.key==='Escape')setConfirm(null);if(e.key==='Tab'){const buttons=dialog.current!.querySelectorAll<HTMLButtonElement>('button');if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus()}else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus()}}}}><h2 id="walk-confirm-title">Finish this walk?</h2><p>{data.gpsEnabled?'GPS recording stops now. All available points will sync before the completed route becomes visible to your family. Offline? Keep this device and retry when connected.':'Finish the timer and save your walk summary.'}</p><>{active&&mine&&<WalkWastePanel key={active.id} walkId={active.id} own finished={false} ending/>}</><div className="walk-actions"><Button className="secondary" onClick={()=>setConfirm(null)}>Cancel</Button><Button disabled={data.busy||!data.ready} onClick={()=>{setConfirm(null);if(active){setFinishingWalk(active.id);void data.finish()}}}>Confirm end</Button></div></div></div>}
 </div>
}
