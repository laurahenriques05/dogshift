import type {Point} from './gps'
export const AREA_CONSENT_KEY='pawshare.walk-area-consent.v1'
const eventName='pawshare:walk-area-consent'
const names=new Map<string,string>(),controllers=new Set<AbortController>()
let queue:Promise<unknown>=Promise.resolve()
export function areaConsent(scope:string){try{return !!scope&&localStorage.getItem(`${AREA_CONSENT_KEY}:${scope}`)==='yes'}catch{return false}}
export function subscribeAreaConsent(fn:()=>void){window.addEventListener(eventName,fn);window.addEventListener('storage',fn);return()=>{window.removeEventListener(eventName,fn);window.removeEventListener('storage',fn)}}
export function setAreaConsent(scope:string,enabled:boolean){
 localStorage.setItem(`${AREA_CONSENT_KEY}:${scope}`,enabled?'yes':'no')
 if(!enabled){controllers.forEach(controller=>controller.abort());names.clear()}
 window.dispatchEvent(new Event(eventName))
}
/** One coarse, real sample near the middle of the route; never transmit the trace. */
export function approximateRouteArea(points:Pick<Point,'latitude'|'longitude'>[]){
 const valid=points.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180)
 if(!valid.length)return null
 const point=valid[Math.floor((valid.length-1)/2)]
 return {latitude:Number(point.latitude.toFixed(2)),longitude:Number(point.longitude.toFixed(2))}
}
export function photonAreaName(value:unknown):string|null{
 if(!value||typeof value!=='object'||!('features'in value)||!Array.isArray(value.features))return null
 const text=(v:unknown)=>typeof v==='string'?v.trim().slice(0,120):''
 for(const feature of value.features){
  const p=feature?.properties;if(!p||typeof p!=='object')continue
  const district=text(p.district)||text(p.locality),city=text(p.city)
  const label=district||city||(['place','boundary'].includes(p.osm_key)?text(p.name):'')
  if(label)return [...new Set([label,city].filter(Boolean))].join(', ')
 }
 return null
}
export function resolveWalkArea(points:Point[],signal:AbortSignal,scope:string):Promise<string|null>{
 const area=approximateRouteArea(points)
 if(!area)return Promise.resolve(null)
 const key=`${area.latitude},${area.longitude}`
 const task=queue.catch(()=>{}).then(async()=>{
  if(signal.aborted||!areaConsent(scope))throw new DOMException('Cancelled','AbortError')
  if(names.has(key))return names.get(key)!
  // Serial, modest requests to the public demo service. Cache only coarse area names in memory.
  await new Promise(resolve=>setTimeout(resolve,1000))
  if(signal.aborted||!areaConsent(scope))throw new DOMException('Cancelled','AbortError')
  const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});controllers.add(controller)
  const timeout=setTimeout(abort,10000)
  try{
   const url=new URL('https://photon.komoot.io/reverse');url.searchParams.set('lat',String(area.latitude));url.searchParams.set('lon',String(area.longitude));url.searchParams.set('limit','3');url.searchParams.set('radius','5');for(const layer of ['locality','district','city'])url.searchParams.append('layer',layer)
   const response=await fetch(url,{signal:controller.signal,referrerPolicy:'no-referrer',credentials:'omit'})
   if(!response.ok)throw new Error('Area lookup unavailable')
   const name=photonAreaName(await response.json())
   if(!areaConsent(scope)||signal.aborted)throw new DOMException('Cancelled','AbortError')
   if(name){names.set(key,name);if(names.size>100)names.delete(names.keys().next().value!)}
   return name
  }finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);controllers.delete(controller)}
 })
 queue=task.catch(()=>{})
 return task
}
