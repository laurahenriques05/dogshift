import { useState } from 'react'
import { Button, Notice } from '../../components/ui'
import type { WeightMeasurement } from '../../lib/supabase/database.types'
import { localTime } from './time'

type Props={measurements:WeightMeasurement[];zone:string;loading:boolean;error:string;busy:boolean;onRetry:()=>void;onEdit:(row:WeightMeasurement)=>void}
export function WeightRecords({measurements,zone,loading,error,busy,onRetry,onEdit}:Props){
 const [expanded,setExpanded]=useState(true)
 return <section className="card weight-records"><header className="health-upcoming-header"><h2>Weight records{!loading&&!error&&` (${measurements.length})`}</h2><Button className="secondary" aria-expanded={expanded} aria-controls="weight-record-list" onClick={()=>setExpanded(value=>!value)}>{expanded?'Hide records':'Show records'}</Button></header>
  {expanded&&<div id="weight-record-list">{loading?<p role="status">Loading measurements…</p>:error?<><Notice error>{error}</Notice><Button onClick={onRetry}>Try again</Button></>:!measurements.length?<p>No weight measurements yet.</p>:<ul className="weight-record-rows">{measurements.map(row=><li key={row.id}><div><strong>{row.weight_kg} <span>kg</span></strong><time dateTime={row.measured_at}>{localTime(row.measured_at,zone).replace('T',' · ')}</time>{row.notes&&<p>{row.notes}</p>}</div><Button className="secondary" disabled={busy} aria-label={`Edit weight ${row.weight_kg} kg measured at ${localTime(row.measured_at,zone)}`} onClick={()=>onEdit(row)}>Edit record</Button></li>)}</ul>}</div>}
 </section>
}
