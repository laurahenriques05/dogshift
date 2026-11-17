import type { WasteMode } from './waste'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, LocateFixed, MapPin, X } from 'lucide-react'
import { Button, Notice } from '../../components/ui'
import { searchStartLocations, type StartLocation } from './startLocation'
import { watchDeviceLocation } from './deviceLocation'
const StartLocationMap = lazy(() => import('./StartLocationMap'))

export function StartWalkDialog({ dogName, busy, blocked, onCancel, onConfirm }: { dogName: string; busy: boolean; blocked: string; onCancel: () => void; onConfirm: (mode: WasteMode, trackGps: boolean) => void }) {
 const dialog = useRef<HTMLDivElement>(null), request = useRef<AbortController | null>(null)
 const [current, setCurrent] = useState<StartLocation | null>(null), [selected, setSelected] = useState<StartLocation | null>(null)
 const [manual, setManual] = useState(false), [locating, setLocating] = useState(true), [gpsError, setGpsError] = useState('')
 const [query, setQuery] = useState(''), [results, setResults] = useState<StartLocation[]>([]), [searching, setSearching] = useState(false), [searchMessage, setSearchMessage] = useState('')
 const [step, setStep] = useState<'tracking' | 'location'>('tracking')
 const [trackGps, setTrackGps] = useState(false)
 const [recordDogWaste, setRecordDogWaste] = useState(false), [wasteMode, setWasteMode] = useState<'during' | 'end'>('during')
 useEffect(() => { if (step !== 'location') dialog.current?.querySelector<HTMLInputElement>('input')?.focus() }, [step])
 const [attempt, setAttempt] = useState(0)
 const [permission, setPermission] = useState('Checking…'), [browserError, setBrowserError] = useState('')
 useEffect(() => {
  if (step !== 'location') return
  let disposed = false, status: PermissionStatus | undefined
  const changed = () => { if (!disposed && status) setPermission(status.state) }
  if (!navigator.permissions?.query) { setPermission('Not reported by this browser'); return }
  void navigator.permissions.query({ name: 'geolocation' }).then(result => {
   if (disposed) return
   status = result; changed(); status.addEventListener('change', changed)
  }).catch(() => { if (!disposed) setPermission('Not reported by this browser') })
  return () => { disposed = true; status?.removeEventListener('change', changed) }
 }, [attempt, step])
 useEffect(() => {
  const previous = document.activeElement as HTMLElement | null
  dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
  const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = overflow; previous?.focus(); request.current?.abort() }
 }, [])
 useEffect(() => {
  if (step !== 'location') return
  setCurrent(null); setLocating(true); setGpsError(''); setBrowserError('')
  if (!window.isSecureContext || !navigator.geolocation) { setLocating(false); setGpsError('Location needs HTTPS and a browser with location support. You can choose another location.'); return }
  return watchDeviceLocation(navigator.geolocation, state => {
   setCurrent(state.location); setLocating(state.locating); setGpsError(state.error); setBrowserError(state.browserError ?? '')
  })
 }, [attempt, step])
 const location = manual ? selected : current
 async function search() {
  request.current?.abort(); const controller = new AbortController(); request.current = controller
  setSearching(true); setResults([]); setSearchMessage('')
  try {
   const places = await searchStartLocations(query, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
   if (controller.signal.aborted) return
   setResults(places); if (!places.length) setSearchMessage('No places found. Include the city and country, or choose a point on the map.')
  } catch { if (!controller.signal.aborted) setSearchMessage('Place search is unavailable. Try again or choose a point on the map.') }
  finally { if (!controller.signal.aborted) setSearching(false) }
 }
 return <div className="walk-dialog-backdrop"><div ref={dialog} className="card walk-dialog walk-start-dialog" role="dialog" aria-modal="true" aria-labelledby="walk-location-title" onKeyDown={event => {
  if (event.key === 'Escape' && !busy) onCancel()
  if (event.key === 'Tab') {
   const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length > 0)
   const first = controls[0], last = controls.at(-1)
   if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
   else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
 }}>
  <div className="walk-location-heading"><div><h2 id="walk-location-title" className="walk-filter-title">{step === 'location' ? 'Where are we starting?' : <><span>Track your route?</span><span className="walk-filter-subtitle">Any filters?</span></>}</h2><p>A little adventure with {dogName}.</p></div><button type="button" className="walk-location-close" aria-label="Cancel start walk" disabled={busy} onClick={onCancel}><X size={20}/></button></div>
  {step === 'tracking' ? <div className="walk-location-body">
   <label className="walk-filter-switch"><span>Route Recording with GPS location</span><input type="checkbox" role="switch" checked={trackGps} disabled={busy} onChange={event => setTrackGps(event.target.checked)}/><span className="walk-filter-switch-track" aria-hidden="true"/></label>
   <label className="walk-filter-switch"><span>Record Dog Waste</span><input type="checkbox" role="switch" checked={recordDogWaste} disabled={busy} onChange={event => setRecordDogWaste(event.target.checked)}/><span className="walk-filter-switch-track" aria-hidden="true"/></label>
   {recordDogWaste && <fieldset className="walk-waste-options"><legend>When would you like to record your dog waste?</legend>
    <label><input type="radio" name="waste-timing" checked={wasteMode === 'during'} onChange={() => setWasteMode('during')}/>During the walk</label>
    <label><input type="radio" name="waste-timing" checked={wasteMode === 'end'} onChange={() => setWasteMode('end')}/>At the end</label>
   </fieldset>}
   {blocked && <Notice>{blocked}</Notice>}
   <div className="walk-location-actions"><Button disabled={busy || !!blocked} onClick={() => trackGps ? setStep('location') : onConfirm(recordDogWaste ? wasteMode : 'off', false)}>{trackGps ? 'Continue' : 'Start walk'}</Button></div>
  </div> : <><Suspense fallback={<p role="status">Loading map…</p>}><StartLocationMap location={location} manual={manual} onChoose={setSelected}/></Suspense>
  <div className="walk-location-body"><div className="walk-location-heading"><span className="icon-tile">{manual ? <MapPin/> : <LocateFixed/>}</span><div><h3>{manual ? 'Choose your starting point' : 'Your current location'}</h3><p role="status">{!manual && locating ? 'Finding you on the map…' : location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${location.accuracy !== undefined ? ` · Accuracy ±${Math.round(location.accuracy)} m` : ''}` : 'Select a location to continue.'}</p></div></div>
  {!manual && gpsError && <Notice error>{gpsError}<p><Button className="secondary" onClick={() => setAttempt(v => v + 1)}>Retry location</Button></p></Notice>}
  {!manual && gpsError && <details><summary>Location diagnostics</summary><p>Browser permission: <strong>{permission}</strong><br/>Secure connection: {window.isSecureContext ? 'Yes' : 'No'}<br/>{browserError && <>Browser response: {browserError}</>}</p>{permission === 'granted' && <p>Permission is granted, but no usable position is available yet. On a Mac, check that Wi-Fi is enabled and try finding your current location in Apple Maps. If Maps also fails, the issue may be with device Location Services. If Maps succeeds, try this page in another browser.</p>}</details>}
  {!manual && current && current.accuracy! > 50 && <Notice>Your location is approximate. Move outdoors for a more accurate fix or choose another location.</Notice>}
  {manual && <><form onSubmit={event => { event.preventDefault(); void search() }}><label htmlFor="walk-place">Address or place, anywhere in the world</label><div className="walk-place-search"><input id="walk-place" value={query} maxLength={240} onChange={e => { request.current?.abort(); setSearching(false); setQuery(e.target.value); setResults([]); setSearchMessage('') }} placeholder="Street, park, city or country"/><Button disabled={query.trim().length < 3 || searching}>{searching ? 'Searching…' : 'Search'}</Button></div></form><p className="muted">Search is provided by Photon / OpenStreetMap. Your search text is sent when you press Search. You can also tap the map to select a point.</p>{searchMessage && <p role="status">{searchMessage}</p>}<ul className="walk-place-results">{results.map((place, i) => <li key={i}><button type="button" onClick={() => { setSelected(place); setResults([]) }}><MapPin size={16}/>{place.label}</button></li>)}</ul>{selected && <p>{selected.label}</p>}</>}
  <p className="muted">The route records your phone’s actual GPS position, and is shared with your family after the walk.</p>
  {blocked && <Notice>{blocked}</Notice>}
  <div className="walk-location-actions"><Button disabled={busy || !!blocked || !location || (!manual && locating)} onClick={() => onConfirm(recordDogWaste ? wasteMode : 'off', true)}>{manual ? 'Confirm selected location' : 'Confirm current location'}</Button><Button className="secondary" disabled={busy} onClick={() => { request.current?.abort(); setSearching(false); setManual(v => !v) }}>{manual ? 'Use current location' : 'Another location'}</Button></div>
  <div className="walk-step-back-row"><button type="button" className="walk-step-back" disabled={busy} onClick={() => setStep('tracking')}><ArrowLeft size={15} aria-hidden="true"/>Back</button></div></div></>}</div></div>
}
