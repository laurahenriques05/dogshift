import type { Walk } from '../../lib/supabase/database.types'
import { GPS_POLICY, segment, type Point } from './gps'
import type { WasteEvent, WasteMode } from './waste'
export type TimelineEntry = { id:string; at:string; label:string }
/** Rebuilt from saved samples/events: no inferred visits, fabricated route or final-only waste times. */
export function walkTimeline(walk: Pick<Walk,'started_at'|'ended_at'>, points: Point[], mode: WasteMode|null, waste: WasteEvent[]): TimelineEntry[] {
 const entries:TimelineEntry[]=[{id:'start',at:walk.started_at,label:'Walk started'}]
 let meters=0,next=500
 const ordered=[...new Map(points.map(point=>[point.seq,point])).values()].sort((a,b)=>a.seq-b.seq)
 ordered.forEach((point,index)=>{
  if(!index){entries.push({id:'gps-start',at:point.recorded_at,label:'First GPS position recorded'});return}
  const previous=ordered[index-1]
  if(Date.parse(point.recorded_at)-Date.parse(previous.recorded_at)>GPS_POLICY.maxGap)entries.push({id:`gap-${point.seq}`,at:point.recorded_at,label:'GPS positions resumed after a recording gap'})
  meters+=segment(previous,point)
  if(meters>=next){entries.push({id:`distance-${next}`,at:point.recorded_at,label:`${(next/1000).toLocaleString('en',{maximumFractionDigits:1})} km recorded`});next+=500}
 })
 if(mode==='during')for(const event of new Map(waste.map(event=>[event.id,event])).values())entries.push({id:`waste-${event.id}`,at:event.recorded_at,label:event.kind==='pee'?'Pee recorded':'Poop recorded'})
 if(walk.ended_at)entries.push({id:'finish',at:walk.ended_at,label:'Walk finished'})
 return entries.filter(entry=>Date.parse(entry.at)>=Date.parse(walk.started_at) && (!walk.ended_at||Date.parse(entry.at)<=Date.parse(walk.ended_at))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||(a.id==='start'?-1:b.id==='start'?1:a.id==='finish'?1:b.id==='finish'?-1:a.id.localeCompare(b.id)))
}
