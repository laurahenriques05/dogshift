import { validPauses, type WalkPause } from './pauseClock'
import { parseNoteDraft, type NoteDraft } from './noteDraft'
import type { Point } from './gps'
export type WalkBuffer = { walk: string; points: Point[]; ending: { at: string; reason: 'manual'|'stationary'; note?:NoteDraft } | null; pauses?:WalkPause[]; paused?: boolean; pauseUpdatedAt?:number }
export function parseBuffer(raw:string|null,walk:string):WalkBuffer|null {
 try {
  const value=JSON.parse(raw||'null')
  if(value?.walk!==walk||!Array.isArray(value.points)||!value.points.every((p:Point)=>Number.isInteger(p.seq)&&p.seq>=0&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=50&&Number.isFinite(Date.parse(p.recorded_at))))return null
  if(value.pauses!==undefined&&!validPauses(value.pauses))return null
  if(value.ending?.note!==undefined&&!parseNoteDraft(JSON.stringify(value.ending.note)))return null
  if(value.pauseUpdatedAt!==undefined&&(!Number.isFinite(value.pauseUpdatedAt)||value.pauseUpdatedAt<0))return null
  if(value.paused!==undefined&&typeof value.paused!=='boolean')return null
  if(value.points.some((p:Point)=>p.segment_start!==undefined&&typeof p.segment_start!=='boolean'))return null
  if(value.ending!==null&&(!value.ending||!Number.isFinite(Date.parse(value.ending.at))||!['manual','stationary'].includes(value.ending.reason)))return null
  return value
 }catch{return null}
}
export function mergeBuffer(current:WalkBuffer,saved:WalkBuffer|null):WalkBuffer {
 if(!saved||saved.walk!==current.walk)return current
 const points=new Map(saved.points.map(p=>[p.seq,p]))
 for(const p of current.points)points.set(p.seq,p)
 const pause=(saved.pauseUpdatedAt??0)>(current.pauseUpdatedAt??0)?saved:current
 return {...current,points:[...points.values()].sort((a,b)=>a.seq-b.seq),ending:current.ending||saved.ending,pauses:pause.pauses??saved.pauses,paused:pause.paused??saved.paused,pauseUpdatedAt:pause.pauseUpdatedAt}
}
