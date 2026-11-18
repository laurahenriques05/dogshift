import { addCompactMapCredits } from './compactMapCredits'
import { applyMapPresentation, type MapViewMode } from './mapPresentation'
import { addDogPlaceTileLayers } from './dogPlaceLayers'
import type { DogPlace } from './dogPlaces'
import { useEffect, useRef, useState } from 'react'
import type { Map as VectorMap, GeoJSONSource, StyleSpecification, Popup } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Button } from '../../components/ui'
import type { Point } from './gps'
import { mapCoordinates } from './mapGeometry'
import { createPinchZoomHandler } from './mapGestures'
import { type ReplayFrame } from './routeReplay'
import { useRouteReplay } from './useRouteReplay'
import { RouteMapControls } from './RouteMapControls'
import { OpenStreetRouteMap } from './OpenStreetRouteMap'
import style from './mapStyle.json'
import 'maplibre-gl/dist/maplibre-gl.css'
import './walks.css'

export default function VectorRouteMap({ points, compact = false, places = [], live = false, mode = 'standard', showDogPlaces = false, onModeError }: { points: Point[]; compact?: boolean; places?: DogPlace[]; live?: boolean; mode?: MapViewMode; showDogPlaces?: boolean; onModeError?:()=>void }) {
 const host = useRef<HTMLDivElement>(null)
 const lastMode=useRef<MapViewMode|null>(null)
 const popup=useRef<Popup|null>(null)
 const poiMap=useRef<VectorMap|null>(null)

 const presentation=useRef({mode,showDogPlaces,onModeError});presentation.current={mode,showDogPlaces,onModeError}
 const fit = useRef<() => void>(() => {})
 const drawPoints = useRef<(points: Point[]) => void>(() => {})
 const renderFrame = useRef<(frame: ReplayFrame, playing: boolean) => void>(() => {})
 const latest = useRef(points)
 const replay = useRouteReplay(points)
 const latestFrame = useRef({ frame: replay.frame, playing: replay.playing })
 const [visible, setVisible] = useState(false), [loading, setLoading] = useState(true), [ready, setReady] = useState(false)
 const [tilePlaces,setTilePlaces]=useState<string[]>([])
 const [error, setError] = useState(''), [retry, setRetry] = useState(0), [fallback, setFallback] = useState(false)
 useEffect(()=>{const map=poiMap.current;if(!map?.getSource('dog-places'))return;void (map.getSource('dog-places') as GeoJSONSource).setData({type:'FeatureCollection',features:places.map(place=>({type:'Feature' as const,properties:{name:place.name,kind:place.kind},geometry:{type:'Point' as const,coordinates:[place.longitude,place.latitude]}}))}).catch(()=>{})},[places,ready])
 useEffect(()=>{const map=poiMap.current;if(!ready||!map)return;if(!showDogPlaces){setTilePlaces([]);popup.current?.remove();popup.current=null}applyMapPresentation(map,mode,showDogPlaces,lastMode.current!==mode);lastMode.current=mode;if(mode!=='satellite')return;const timer=setTimeout(()=>{if(!map.isSourceLoaded('walk-satellite'))presentation.current.onModeError?.()},20000);return()=>clearTimeout(timer)},[mode,showDogPlaces,ready])
 const hasPoints = mapCoordinates(points).length > 0
 useEffect(() => { latest.current = points; drawPoints.current(points) }, [points])
 useEffect(() => { latestFrame.current = { frame: replay.frame, playing: replay.playing }; renderFrame.current(replay.frame, replay.playing) }, [replay.frame, replay.playing])
 useEffect(() => {
  if (!host.current || fallback) return
  const observer = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
  })
  observer.observe(host.current)
  return () => observer.disconnect()
 }, [hasPoints, fallback])
 useEffect(() => {
  if (!visible || !host.current || !hasPoints || fallback) return
  const element = host.current
  let disposed = false, instance: VectorMap | undefined, resize: ResizeObserver | undefined
  let removeWheel: (() => void) | undefined
  setLoading(true); setReady(false); setError('')
  void import('maplibre-gl').then(M => {
   if (disposed) return
   M.setWorkerUrl(workerUrl)
   instance = new M.Map({
    container: element, style: structuredClone(style) as StyleSpecification,
    center: [0, 0], zoom: 0, minZoom: 0, maxZoom: 20,
    scrollZoom: false, doubleClickZoom: false, dragRotate: false,
    dragPan: true,
    touchZoomRotate: true, touchPitch: false, attributionControl: false,
    renderWorldCopies: true, pitchWithRotate: false,
   })
   const map = instance
   poiMap.current=map
   addCompactMapCredits(map,M)
   map.touchZoomRotate.disableRotation()
   map.addControl(new M.NavigationControl({ showCompass: false }), 'top-left')
   map.addControl(new M.ScaleControl({ unit: 'metric' }), 'bottom-left')
   let following=true
   map.on('dragstart',()=>{following=false})
   map.on('zoomstart',event=>{if(event.originalEvent)following=false})
   let bounds = new M.LngLatBounds()
   const updateBounds = (next: Point[]) => {
    const coordinates = mapCoordinates(next)
    if (!coordinates.length) return
    let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity
    for (const [lat, lng] of coordinates) { south = Math.min(south, lat); north = Math.max(north, lat); west = Math.min(west, lng); east = Math.max(east, lng) }
    bounds = new M.LngLatBounds([west, south], [east, north])
    const [start, end] = [coordinates[0], coordinates.at(-1)!]
    if(live&&following)map.jumpTo({center:[end[1],end[0]]})
    void (map.getSource('walk-ends') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [start, end].map(([lat, lng], i) => ({ type: 'Feature', properties: { kind: i ? 'finish' : 'start' }, geometry: { type: 'Point', coordinates: [lng, lat] } })) }).catch(() => {})
   }
   fit.current = () => {following=true;const current=latest.current.at(-1);if(live&&current)map.jumpTo({center:[current.longitude,current.latitude],zoom:15.5,pitch:presentation.current.mode==='3d'?55:0});else map.fitBounds(bounds, { padding: 35, maxZoom: 15.5, duration: 0,pitch:presentation.current.mode==='3d'?55:0 })}
   const onWheel = createPinchZoomHandler((delta, event) => {
    following=false
    const box = element.getBoundingClientRect()
    map.zoomTo(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + delta)), { around: map.unproject([event.clientX - box.left, event.clientY - box.top]), duration: 0 })
   })
   element.addEventListener('wheel', onWheel, { passive: false })
   removeWheel = () => element.removeEventListener('wheel', onWheel)
   map.on('style.load', () => {
    if (disposed) return
    addDogPlaceTileLayers(map)
    map.on('click','walk-dog-tile-dot',event=>{const feature=event.features?.[0];if(feature?.geometry.type==='Point'){popup.current?.remove();popup.current=new M.Popup().setLngLat(feature.geometry.coordinates as [number,number]).setText(String(feature.properties['name:en']||feature.properties.name_en||feature.properties.name||'Dog place')).addTo(map)}})
    const empty = { type: 'FeatureCollection' as const, features: [] }
    map.addSource('dog-places', { type: 'geojson', data: empty })
    map.addLayer({id:'dog-places-dot',type:'circle',source:'dog-places',paint:{'circle-radius':6,'circle-color':'#244d3c','circle-stroke-color':'#fffdf7','circle-stroke-width':2}})
    map.addLayer({id:'dog-places-label',type:'symbol',source:'dog-places',layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':12,'text-offset':[0,1.4],'text-anchor':'top','text-max-width':12},paint:{'text-color':'#244d3c','text-halo-color':'#fffdf7','text-halo-width':2}})
    map.on('click','dog-places-dot',event=>{const feature=event.features?.[0];if(feature&&feature.geometry.type==='Point'){popup.current?.remove();popup.current=new M.Popup().setLngLat(feature.geometry.coordinates as [number,number]).setText(`${feature.properties.name} · ${feature.properties.kind}`).addTo(map)}})
    map.addSource('walk-route', { type: 'geojson', data: empty })
    map.addSource('walk-ends', { type: 'geojson', data: empty })
    map.addLayer({ id: 'walk-route-halo', type: 'line', source: 'walk-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffdf7', 'line-width': 8 } })
    map.addLayer({ id: 'walk-route-green', type: 'line', source: 'walk-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#425c39', 'line-width': 5 } })
    map.addLayer({ id: 'walk-ends', type: 'circle', source: 'walk-ends', paint: { 'circle-radius': 5, 'circle-color': ['match', ['get', 'kind'], 'start', '#fffdf7', '#425c39'], 'circle-stroke-color': ['match', ['get', 'kind'], 'start', '#425c39', '#fffdf7'], 'circle-stroke-width': 2.5 } })
    drawPoints.current = updateBounds
    let finishVisible = true
    let applying = false
    let queued: ReplayFrame | null = null
    const flushFrame = async () => {
     if (applying || !queued || disposed) return
     const frame = queued
     queued = null; applying = true
     try {
      await (map.getSource('walk-route') as GeoJSONSource).setData({ type: 'FeatureCollection', features: frame.lines.length ? [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: frame.lines.map(line => line.map(([lat, lng]) => [lng, lat])) } }] : [] })
     } catch { if (!disposed) setError('The route could not be drawn. Retry map.') }
     finally { applying = false; if (queued && !disposed) void flushFrame() }
    }
    renderFrame.current = (frame, playing) => {
     if (finishVisible === playing) { finishVisible = !playing; map.setFilter('walk-ends', playing ? ['==', ['get', 'kind'], 'start'] : null) }
     queued = frame; void flushFrame()
    }
    applyMapPresentation(map,presentation.current.mode,presentation.current.showDogPlaces,false);lastMode.current=presentation.current.mode
    updateBounds(latest.current); renderFrame.current(latestFrame.current.frame, latestFrame.current.playing)
    fit.current(); setReady(true)
   })
   map.on('idle',()=>{if(disposed||!map.getLayer('walk-dog-tile-dot'))return;const names=[...new Set(map.queryRenderedFeatures({layers:['walk-dog-tile-dot']}).map(feature=>String(feature.properties['name:en']||feature.properties.name_en||feature.properties.name||'Dog place')))].sort().slice(0,20);setTilePlaces(previous=>previous.join('|')===names.join('|')?previous:names)})
   map.on('load', () => { if (!disposed) setLoading(false) })
   map.on('error', event => {if(disposed)return;setLoading(false);if(presentation.current.mode==='satellite'){presentation.current.onModeError?.();return}if('sourceId' in event&&event.sourceId==='walk-satellite')return;setError('Some map details could not load. Retry map.')})
   resize = new ResizeObserver(() => map.resize())
   resize.observe(element)
  }).catch(() => { if (!disposed) setFallback(true) })
  return () => { disposed = true; removeWheel?.(); resize?.disconnect(); popup.current?.remove();popup.current=null;instance?.remove(); poiMap.current=null; drawPoints.current = () => {}; renderFrame.current = () => {}; fit.current = () => {} }
 }, [visible, hasPoints, retry, fallback, live])
 if (!hasPoints) return <p className="walk-empty">{live?'Waiting for your first recorded GPS position…':'No GPS route recorded. Time-only walks are still included in summaries.'}</p>
 if (fallback) return <OpenStreetRouteMap points={points} compact={compact} places={places} live={live} mode={mode} showDogPlaces={showDogPlaces}/>
 return <figure className={`walk-route-map walk-vector-map${compact ? ' compact' : ''}`}>
  <div ref={host} className="walk-map-canvas" role="region" aria-label="Recorded walking route map. Pinch to zoom; normal scrolling leaves the map unchanged."/>
  <span className="walk-map-north" aria-hidden="true">N ↑</span>
  {visible && loading && <p className="walk-map-status" role="status">Loading street map…</p>}
  {error && <p className="walk-map-status" role="alert">{error} <Button className="secondary" onClick={() => setRetry(value => value + 1)}>Retry map</Button></p>}
  <RouteMapControls live={live} playing={replay.playing} disabled={!ready || !replay.canReplay} status={replay.status} onFit={() => fit.current()} onReplay={() => { if (!replay.playing) fit.current(); replay.toggle() }}/>
  {!!tilePlaces.length&&<ul className="sr-only" aria-label="Dog places in the visible map">{tilePlaces.map(name=><li key={name}>{name}</li>)}</ul>}

 </figure>
}
