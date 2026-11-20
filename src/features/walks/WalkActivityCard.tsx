import {areaConsent,subscribeAreaConsent,resolveWalkArea} from './walkArea'
import { WalkWastePanel } from './WalkWastePanel'
import { Footprints, ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button, errorMessage } from '../../components/ui'
import { getPoints } from './api'
import { RouteMap } from './RouteMap'
import { type Point } from './gps'
import './walks.css'
import { kilometersLabel } from './mapGestures'

export function WalkStats({ meters, seconds }: { meters: number; seconds: number }) {
 const minutes = Math.floor(seconds / 60)
 return <dl className="walk-activity-stats">
  <div><dt>Distance</dt><dd>{kilometersLabel(meters)} <small>km</small></dd></div>
  <div><dt>Time</dt><dd>{minutes < 60 ? <>{minutes}<small>min</small> {Math.floor(seconds % 60)}<small>s</small></> : <>{Math.floor(minutes / 60)}<small>h</small> {minutes % 60}<small>min</small></>}</dd></div>
  <div><dt>Average speed</dt><dd>{(seconds > 0 ? meters / seconds * 3.6 : 0).toFixed(1)} <small>km/h</small></dd></div>
 </dl>
}
function SavedRoutePreview({ id, hideEmpty = false,onPoints }: { id: string; hideEmpty?: boolean;onPoints:(points:Point[])=>void }) {
 const host = useRef<HTMLDivElement>(null)
 const [visible, setVisible] = useState(false)
 const [points, setPoints] = useState<Point[] | null>(null)
 const [error, setError] = useState('')
 const [retry, setRetry] = useState(0)
 useEffect(() => {
  if (!host.current) return
  const observer = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
  })
  observer.observe(host.current)
  return () => observer.disconnect()
 }, [])
 useEffect(() => {
  if (!visible) return
  let live = true
  setError(''); setPoints(null)
  void getPoints(id).then(result => { if (live){setPoints(result);onPoints(result)} }).catch(e => { if (live) setError(errorMessage(e)) })
  return () => { live = false }
 }, [id, visible, retry,onPoints])
 return <div ref={host} className="walk-saved-route">{error ? <p role="alert">Route unavailable: {error} <Button className="secondary" onClick={() => setRetry(n => n + 1)}>Retry route</Button></p> : points ? (hideEmpty && !points.length ? null : <RouteMap points={points} compact/>) : <p role="status">{visible ? 'Loading saved route…' : 'Map loads when viewed.'}</p>}</div>
}
export function WalkActivityCard({ id, title, startedAt, location, points, meters, seconds, loadRoute = false, deleted = false, onRestore, onDelete,areaScope='' }: {
 areaScope?:string; id: string; title: string; startedAt: string; location?: string; points?: Point[]; meters: number; seconds: number; loadRoute?: boolean; deleted?: boolean; onRestore?: () => void; onDelete?: () => void
}) {
 const enabled=useSyncExternalStore(subscribeAreaConsent,()=>areaConsent(areaScope),()=>false)
 const [savedPoints,setSavedPoints]=useState<Point[]|undefined>(points),[area,setArea]=useState(''),[areaStatus,setAreaStatus]=useState(''),[areaRetry,setAreaRetry]=useState(0)
 useEffect(()=>{setSavedPoints(points);setArea('')},[id,points])
 useEffect(()=>{
  if(!enabled||!savedPoints){setArea('');setAreaStatus('');return}
  if(!savedPoints.length){setArea('');setAreaStatus('No route area available');return}
  const controller=new AbortController();let alive=true;setAreaStatus('Finding walk area…')
  void resolveWalkArea(savedPoints,controller.signal,areaScope).then(name=>{if(alive){setArea(name??'');setAreaStatus(name?'Approximate route area':'Area unavailable')}}).catch(()=>{if(alive)setAreaStatus('Area unavailable')})
  return()=>{alive=false;controller.abort()}
 },[enabled,savedPoints,areaRetry,areaScope])
 const displayTitle=enabled&&area?area:location||title
 return <article className={`walk-activity-card${onDelete ? ' walk-activity-deletable' : ''}`}>
  {onDelete && <button type="button" className="walk-delete-icon" aria-label={`Delete ${displayTitle}`} onClick={onDelete}><X size={15} aria-hidden="true"/></button>}
  <div className="walk-activity-heading"><span className="icon-tile"><Footprints size={28}/></span><div><p className="muted">{new Date(startedAt).toLocaleString()}</p><h3>{deleted ? displayTitle : <Link to={`/walks/${id}`}>{displayTitle}</Link>}</h3></div></div>
  {enabled&&areaStatus&&<p className="walk-area-status" role="status">{areaStatus}{areaStatus==='Area unavailable'&&<button type="button" className="walk-text-action" onClick={()=>setAreaRetry(value=>value+1)}>Retry area</button>}</p>}
  <WalkStats meters={meters} seconds={seconds}/>
  {(points ? <RouteMap points={points} compact/> : loadRoute && <SavedRoutePreview id={id} hideEmpty={deleted} onPoints={setSavedPoints}/>)}
  {deleted && <WalkWastePanel walkId={id} own finished readOnly/>}
  <div className="walk-activity-footer">{deleted ? <button type="button" className="walk-restore-link" onClick={onRestore}>Restore walk <ArrowUpRight size={16} aria-hidden="true"/></button> : <Link to={`/walks/${id}`}>View walk <ArrowUpRight size={16}/></Link>}</div>
 </article>
}
