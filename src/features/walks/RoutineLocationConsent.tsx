import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { Button } from '../../components/ui'
import { routineDeviceLocation, type RoutinePlace } from './routineSchedule'
export function RoutineLocationConsent({value,onChange,disabled}:{value:RoutinePlace|null;onChange:(place:RoutinePlace|null)=>void;disabled:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),alive=useRef(true),request=useRef(0)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++}},[])
 function locate(){
  if(busy||disabled)return
  if(!navigator.geolocation){setError('Location is unavailable in this browser. Use a device with location access.');return}
  const version=++request.current;onChange(null);setBusy(true);setError('')
  // Explicit button click only: the browser asks for permission before acquisition.
  navigator.geolocation.getCurrentPosition(position=>{
   if(!alive.current||version!==request.current)return
   try{onChange(routineDeviceLocation(position.coords.latitude,position.coords.longitude))}catch{setError('Location could not be used. Try again.')}
   setBusy(false)
  },failure=>{
   if(!alive.current||version!==request.current)return
   setError(failure.code===1?'Location denied. Allow location in browser settings, then try again.':'Location unavailable. Check device location settings and try again.');setBusy(false)
  },{enableHighAccuracy:false,maximumAge:300000,timeout:15000})
 }
 return <div className="walk-routine-place"><p>Use your device location to estimate today’s sunrise. An approximate position is saved with the shared routine.</p><Button type="button" className="secondary" disabled={disabled||busy} onClick={locate}><LocateFixed size={16} aria-hidden="true"/>{busy?'Finding location…':value?'Update location':'Use current location'}</Button>{value&&<small role="status">Approximate location selected.</small>}{error&&<p role="alert">{error}</p>}</div>
}
