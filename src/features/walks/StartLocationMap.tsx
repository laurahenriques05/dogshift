import { useEffect, useRef, useState } from 'react'
import type { Map as VectorMap, Marker, StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import style from './mapStyle.json'
import { createPinchZoomHandler } from './mapGestures'
import { LocateFixed } from 'lucide-react'
import { Button } from '../../components/ui'
import type { StartLocation } from './startLocation'
import 'maplibre-gl/dist/maplibre-gl.css'
import './walks.css'

export default function StartLocationMap({ location }: { location: StartLocation | null }) {
 const host = useRef<HTMLDivElement>(null), map = useRef<VectorMap | null>(null), marker = useRef<Marker | null>(null)
 const centered = useRef(false)
 const latest = useRef(location); latest.current = location
 const [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0)
 useEffect(() => {
  let disposed = false
  setLoading(true); setError('')
  const timeout = window.setTimeout(() => { if (!disposed) { setLoading(false); setError('Map loading timed out. Check your connection and retry.') } }, 20000)
  void import('maplibre-gl').then(M => {
   if (disposed || !host.current) return
   M.setWorkerUrl(workerUrl)
   const initial = latest.current
   const instance = new M.Map({ container: host.current, style: structuredClone(style) as StyleSpecification, center: initial ? [initial.longitude, initial.latitude] : [0, 20], zoom: initial ? 16 : 1, maxZoom: 20, scrollZoom: false, doubleClickZoom: false, dragPan: true, touchZoomRotate: true, dragRotate: false, touchPitch: false })
   map.current = instance; centered.current = !!initial
   const dot = document.createElement('div'); dot.className = 'walk-location-dot'
   marker.current = new M.Marker({ element: dot })
   if (initial) marker.current.setLngLat([initial.longitude, initial.latitude]).addTo(instance)
   instance.addControl(new M.NavigationControl({ showCompass: false }), 'top-right')
   instance.touchZoomRotate.disableRotation()
   const element = host.current
   const onWheel = createPinchZoomHandler((delta, event) => {
    const box = element.getBoundingClientRect()
    instance.zoomTo(Math.max(instance.getMinZoom(), Math.min(instance.getMaxZoom(), instance.getZoom() + delta)), { around: instance.unproject([event.clientX - box.left, event.clientY - box.top]), duration: 0 })
   })
   element.addEventListener('wheel', onWheel, { passive: false })
   instance.on('load', () => { if (!disposed) { clearTimeout(timeout); setLoading(false); setError('') } })
   instance.on('error', () => { if (!disposed) { setLoading(false); setError('Some map details could not load. Check your connection or retry.') } })
   const resize = new ResizeObserver(() => instance.resize()); resize.observe(host.current)
   cleanup = () => { element.removeEventListener('wheel', onWheel); centered.current = false; resize.disconnect(); marker.current?.remove(); instance.remove(); map.current = null; marker.current = null }
  }).catch(() => { if (!disposed) { setLoading(false); setError('Map unavailable on this device. Please retry.') } })
  let cleanup = () => {}
  return () => { disposed = true; clearTimeout(timeout); cleanup() }
 }, [attempt])
 useEffect(() => {
  if (!location) { marker.current?.remove(); centered.current = false; return }
  if (!map.current || !marker.current) return
  marker.current.setLngLat([location.longitude, location.latitude]).addTo(map.current)
  // GPS updates move the marker, but must not undo the user's pan or zoom.
  if (!centered.current) {
   map.current.jumpTo({ center: [location.longitude, location.latitude], zoom: 16 })
   centered.current = true
  }
 }, [location])
 return <div className="walk-location-map-wrap"><div ref={host} className="walk-location-map" role="region" aria-label="Starting location map. Drag to explore. Pinch or use the zoom controls to zoom. Normal scrolling leaves the map unchanged."/>{location && <Button className="secondary walk-location-recenter" onClick={() => map.current?.jumpTo({ center: [location.longitude, location.latitude], zoom: 16 })}><LocateFixed size={14} aria-hidden="true"/>Recenter</Button>}{loading && <p className="walk-map-status" role="status">Loading street map…</p>}{error && <p className="walk-map-status" role="alert">{error} <button type="button" onClick={() => setAttempt(v => v + 1)}>Retry map</button></p>}</div>
}
