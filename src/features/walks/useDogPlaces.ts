import { useEffect, useMemo, useRef, useState } from 'react'
import { type Point } from './gps'
import { fetchDogPlaces, nearestDogPlaces, shouldRefreshPlaces, type DogPlace } from './dogPlaces'
/** Explicit, session-only opt-in. No GPS history, account or walk ID is sent. */
export function useDogPlaces(point: Point | undefined, enabled: boolean) {
 const [places,setPlaces]=useState<DogPlace[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,retry]=useState(0)
 const last=useRef<{position:Point;at:number;revision:number}|null>(null),latest=useRef(point)
 latest.current=point
 useEffect(()=>{
  if(!enabled){setPlaces([]);setError('');setLoading(false);last.current=null;return}
  let disposed=false,controller:AbortController|undefined,inFlight=false
  const update=async()=>{
   const position=latest.current
   if(!position || inFlight)return
   const previous=last.current
   if(previous && previous.revision===revision && !shouldRefreshPlaces(previous,position,Date.now()))return
   inFlight=true;controller=new AbortController();setLoading(true);setError('')
   last.current={position,at:Date.now(),revision}
   try{const result=await fetchDogPlaces(position,AbortSignal.any([controller.signal,AbortSignal.timeout(25000)]));if(!disposed)setPlaces(result)}
   catch{if(!disposed)setError('Nearby places could not load. Your GPS recording is unaffected.')}
   finally{inFlight=false;if(!disposed)setLoading(false)}
  }
  void update();const timer=setInterval(()=>void update(),10000)
  return()=>{disposed=true;controller?.abort();clearInterval(timer)}
 },[enabled,revision])
 const nearby=useMemo(()=>point?nearestDogPlaces(places,point):[],[places,point])
 return {places:nearby,loading,error,retry:()=>{last.current=null;retry(value=>value+1)}}
}
