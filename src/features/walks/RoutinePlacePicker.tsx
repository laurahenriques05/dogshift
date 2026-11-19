import { useEffect, useRef, useState } from 'react'
import { Button, Field } from '../../components/ui'
import { searchStartLocations, type StartLocation } from './startLocation'
import type { RoutinePlace } from './routineSchedule'
export function RoutinePlacePicker({value,onChange,disabled}:{value:RoutinePlace|null;onChange:(place:RoutinePlace|null)=>void;disabled:boolean}){
 const [query,setQuery]=useState(value?.label??''),[results,setResults]=useState<StartLocation[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const controller=useRef<AbortController|null>(null)
 useEffect(()=>()=>controller.current?.abort(),[])
 async function search(){
  if(query.trim().length<2)return
  controller.current?.abort();const request=new AbortController();controller.current=request;setBusy(true);setError('');setResults([])
  try{const places=await searchStartLocations(query,AbortSignal.any([request.signal,AbortSignal.timeout(15000)]));if(!request.signal.aborted){setResults(places);if(!places.length)setError('No matching place. Try a nearby town.')}}catch{if(!request.signal.aborted)setError('Place search unavailable. Try again.')}finally{if(!request.signal.aborted)setBusy(false)}
 }
 return <div className="walk-routine-place"><Field label="Town or city" value={query} maxLength={200} disabled={disabled} onChange={event=>{controller.current?.abort();setBusy(false);setQuery(event.target.value);setResults([]);onChange(null)}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void search()}}}/><Button type="button" className="secondary" disabled={disabled||busy||query.trim().length<2} onClick={()=>void search()}>{busy?'Searching…':'Find place'}</Button>{value&&<small>Selected: {value.label}</small>}{error&&<p role="alert">{error}</p>}{!!results.length&&<ul aria-label="Matching routine locations">{results.map((place,index)=><li key={`${place.latitude}-${place.longitude}-${index}`}><button type="button" disabled={disabled} onClick={()=>{const selected={latitude:place.latitude,longitude:place.longitude,label:place.label.slice(0,200)};onChange(selected);setQuery(selected.label);setResults([])}}>{place.label}</button></li>)}</ul>}</div>
}
