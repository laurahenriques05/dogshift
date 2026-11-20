import { MapCredits } from './MapCredits'
import { addDogPlaceTileLayers, retainDogPlacesOnZoomOut } from './dogPlaceLayers'
import { applyMapPresentation, MAP_APPROACH_MS, motionDuration, type MapViewMode } from './mapPresentation'
import { MapPreferences } from './MapPreferences'
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
export default function StartLocationMap({location}:{location:StartLocation|null}){
 const host=useRef<HTMLDivElement>(null),map=useRef<VectorMap|null>(null),marker=useRef<Marker|null>(null),centered=useRef(false),loaded=useRef(false),draw=useRef<()=>void>(()=>{})
 const [mode,setMode]=useState<MapViewMode>('standard'),[dogs,setDogs]=useState(false),[ready,setReady]=useState(false),[framed,setFramed]=useState(false)
 const lastMode=useRef<MapViewMode|null>(null)
 const latest=useRef({location,mode,dogs});latest.current={location,mode,dogs}
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  let disposed=false,cleanup=()=>{}
  loaded.current=false;setReady(false);setFramed(false);setLoading(true);setError('')
  const timeout=setTimeout(()=>{if(!disposed){setLoading(false);setError('Map unavailable. You can retry while GPS keeps searching.')}},20000)
  void import('maplibre-gl').then(M=>{
   if(disposed||!host.current)return
   M.setWorkerUrl(workerUrl)
   const instance=new M.Map({container:host.current,style:structuredClone(style) as StyleSpecification,center:[0,20],zoom:1,maxZoom:20,scrollZoom:false,doubleClickZoom:false,dragPan:true,touchZoomRotate:true,dragRotate:false,touchPitch:false,attributionControl:false})
   map.current=instance;centered.current=false
   const dot=document.createElement('div');dot.className='walk-location-dot';marker.current=new M.Marker({element:dot})
   instance.addControl(new M.NavigationControl({showCompass:false}),'top-left');
   instance.touchZoomRotate.disableRotation()
   draw.current=()=>{
    const point=latest.current.location
    if(!point){marker.current?.remove();centered.current=false;return}
    marker.current?.setLngLat([point.longitude,point.latitude]).addTo(instance)
    if(!centered.current&&loaded.current){
     centered.current=true
     instance.jumpTo({center:[0,20],zoom:1,pitch:0});setFramed(true)
     instance.flyTo({center:[point.longitude,point.latitude],zoom:15.5,pitch:latest.current.mode==='3d'?55:0,duration:motionDuration(MAP_APPROACH_MS),essential:false})
    }
   }
   const element=host.current
   const onWheel=createPinchZoomHandler((delta,event)=>{const box=element.getBoundingClientRect();instance.zoomTo(Math.max(instance.getMinZoom(),Math.min(instance.getMaxZoom(),instance.getZoom()+delta)),{around:instance.unproject([event.clientX-box.left,event.clientY-box.top]),duration:0})})
   element.addEventListener('wheel',onWheel,{passive:false})
   instance.on('style.load',()=>{if(!disposed){addDogPlaceTileLayers(instance);retainDogPlacesOnZoomOut(instance);applyMapPresentation(instance,latest.current.mode,latest.current.dogs,false);lastMode.current=latest.current.mode}})
   instance.on('load',()=>{if(!disposed){clearTimeout(timeout);setLoading(false);loaded.current=true;setReady(true)}})
   instance.on('error',event=>{if(disposed)return;setLoading(false);if(latest.current.mode==='satellite'){setMode('standard');setError('Imagery unavailable. Standard map is shown.')}else setError('Some map details could not load. You can retry.')})
   const resize=new ResizeObserver(()=>instance.resize());resize.observe(element)
   draw.current()
   cleanup=()=>{element.removeEventListener('wheel',onWheel);resize.disconnect();marker.current?.remove();instance.remove();map.current=null;marker.current=null;draw.current=()=>{};centered.current=false}
  }).catch(()=>{if(!disposed){setLoading(false);setError('Map unavailable on this device. Please retry.')}})
  return()=>{disposed=true;clearTimeout(timeout);cleanup()}
 },[attempt])
 useEffect(()=>draw.current(),[location])
 useEffect(()=>{const instance=map.current;if(!instance||!ready)return;applyMapPresentation(instance,mode,dogs,lastMode.current!==mode);lastMode.current=mode;draw.current();if(mode!=='satellite')return;const timer=setTimeout(()=>{if(!instance.isSourceLoaded('walk-satellite')){setMode('standard');setError('Imagery unavailable. Standard map is shown.')}},20000);return()=>clearTimeout(timer)},[mode,dogs,ready])
 return <><div className="walk-location-map-wrap"><div ref={host} style={{visibility:framed?'visible':'hidden'}} className="walk-location-map" role="region" aria-label="Starting location map. Drag in any direction. Pinch or use zoom controls."/>{location&&<Button className="secondary walk-location-recenter" onClick={()=>map.current?.flyTo({center:[location.longitude,location.latitude],zoom:15.5,duration:0})}><LocateFixed size={14} aria-hidden="true"/>Recenter</Button>}{(loading||!framed)&&!error&&<p className="walk-map-status" role="status">{location?'Loading map…':'Finding your location…'}</p>}{error&&<p className="walk-map-status" role="alert">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)}>Retry map</button></p>}<MapPreferences mode={mode} onMode={setMode} dogs={dogs} onDogs={setDogs}/></div><MapCredits mode={mode}/></>
}
