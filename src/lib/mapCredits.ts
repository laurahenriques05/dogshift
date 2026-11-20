export type MapCreditMode='standard'|'3d'|'satellite'
const maps=new Map<symbol,MapCreditMode>(),listeners=new Set<()=>void>()
export function registerMapCredits(mode:MapCreditMode){const id=Symbol();maps.set(id,mode);listeners.forEach(fn=>fn());return()=>{maps.delete(id);listeners.forEach(fn=>fn())}}
export function subscribeMapCredits(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}}
export function satelliteCreditsVisible(){return [...maps.values()].includes('satellite')}
