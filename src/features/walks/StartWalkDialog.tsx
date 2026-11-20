import type { WasteMode } from './waste'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, LocateFixed, X } from 'lucide-react'
import { Button, Notice } from '../../components/ui'
import type { StartLocation } from './startLocation'
import { watchDeviceLocation } from './deviceLocation'
const StartLocationMap = lazy(() => import('./StartLocationMap'))

export function StartWalkDialog({ dogName, busy, blocked, onCancel, onConfirm }: { dogName: string; busy: boolean; blocked: string; onCancel: () => void; onConfirm: (mode: WasteMode, trackGps: boolean) => void }) {
 const dialog = useRef<HTMLDivElement>(null)
 const [current, setCurrent] = useState<StartLocation | null>(null)
 const [locating, setLocating] = useState(true), [gpsError, setGpsError] = useState('')
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
  return () => { document.body.style.overflow = overflow; previous?.focus() }
 }, [])
 useEffect(() => {
  if (step !== 'location') return
  setCurrent(null); setLocating(true); setGpsError(''); setBrowserError('')
  if (!window.isSecureContext || !navigator.geolocation) { setLocating(false); setGpsError('Location needs HTTPS and a browser with location support.'); return }
  return watchDeviceLocation(navigator.geolocation, state => {
   setCurrent(state.location); setLocating(state.locating); setGpsError(state.error); setBrowserError(state.browserError ?? '')
  })
 }, [attempt, step])
 function retryLocation() {
  // Invalidate the rejected fix immediately, before the replacement watch starts.
  setCurrent(null); setLocating(true); setGpsError(''); setBrowserError('')
  setAttempt(value => value + 1)
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
  </div> : <><Suspense fallback={<p role="status">Loading map…</p>}><StartLocationMap location={current}/></Suspense>
  <div className="walk-location-body"><div className="walk-location-heading walk-current-location-heading"><span className="icon-tile"><LocateFixed size={30} aria-hidden="true"/></span><div><h3>Your current location</h3><p role="status">{locating ? 'Finding you on the map…' : current ? `${current.latitude.toFixed(5)}, ${current.longitude.toFixed(5)}${current.accuracy !== undefined ? ` · Accuracy ±${Math.round(current.accuracy)} m` : ''}` : 'Waiting for your device’s current location.'}</p></div></div>
  {gpsError && <Notice error>{gpsError}</Notice>}
  {gpsError && <details><summary>Location diagnostics</summary><p>Browser permission: <strong>{permission}</strong><br/>Secure connection: {window.isSecureContext ? 'Yes' : 'No'}<br/>{browserError && <>Browser response: {browserError}</>}</p>{permission === 'granted' && <p>Permission is granted, but no usable position is available yet. On a Mac, check that Wi-Fi is enabled and try finding your current location in Apple Maps. If Maps also fails, the issue may be with device Location Services. If Maps succeeds, try this page in another browser.</p>}</details>}
  {blocked && <Notice>{blocked}</Notice>}
  <div className="walk-location-actions"><Button disabled={busy || !!blocked || !current || locating} onClick={() => onConfirm(recordDogWaste ? wasteMode : 'off', true)}>Confirm location</Button><Button className="secondary" disabled={busy} onClick={retryLocation}>Retry search again</Button></div>
  <div className="walk-step-back-row"><button type="button" className="walk-step-back" disabled={busy} onClick={() => setStep('tracking')}><ArrowLeft size={15} aria-hidden="true"/>Back</button></div></div></>}</div></div>
}
