import { useEffect, useMemo, useState } from 'react'
import type { Walk } from '../../lib/supabase/database.types'
import type { Point } from './gps'
import { getWalkWaste, type WasteEvent, type WasteMode } from './waste'
import { walkTimeline } from './timelineEvents'
export function WalkTimeline({walk,points,timezone,revision=0,heading=true}:{walk:Walk;points:Point[];timezone:string;revision?:number;heading?:boolean}) {
 const [waste,setWaste]=useState<{mode:WasteMode|null;events:WasteEvent[]}>({mode:null,events:[]}),[error,setError]=useState(false)
 useEffect(()=>{let live=true;setWaste({mode:null,events:[]});setError(false);void getWalkWaste(walk.id).then(data=>{if(live)setWaste(data)}).catch(()=>{if(live)setError(true)});return()=>{live=false}},[walk.id,revision])
 const entries=useMemo(()=>walkTimeline(walk,points,waste.mode,waste.events),[walk.started_at,walk.ended_at,points,waste])
 const clock=new Intl.DateTimeFormat('en',{timeZone:timezone,hour:'2-digit',minute:'2-digit'})
 return <section className="walk-timeline" aria-label="Walk timeline">{heading&&<h3>Walk Timeline</h3>}{error&&<p className="muted">Waste entries could not load. Route milestones are shown.</p>}<ol>{entries.map(entry=><li key={entry.id}><time dateTime={entry.at}>{clock.format(new Date(entry.at))}</time><span>{entry.label}</span></li>)}</ol></section>
}
