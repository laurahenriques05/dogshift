import { useState } from 'react'
import { timeLabel } from './gps'
import { WalkFilterSelect } from './WalkFilterSelect'
import { dailyHistoryChart, historyChart, type HistoryEntry, type HistoryPeriod } from './history'

export function WalkSummaryChart({history, period, timezone, now}: {history: HistoryEntry[]; period: HistoryPeriod; timezone: string; now: Date}) {
 const buckets = period==='day' ? dailyHistoryChart(history,timezone,now) : historyChart(history,period,timezone,now)
 const [metric,setMetric] = useState<'count'|'meters'|'seconds'>('count')
 const valueOf = (bucket: typeof buckets[number]) => metric==='meters' ? bucket.meters/1000 : metric==='seconds' ? bucket.seconds/60 : bucket.count
 const highest = Math.max(0,...buckets.map(valueOf))
 // Round the scale up to readable steps, with no fixed ceiling on recorded values.
 const roughStep = Math.max(highest,1)/4
 const magnitude = 10**Math.floor(Math.log10(roughStep))
 const step = Math.max(metric==='meters'?0:1,Math.ceil(roughStep/magnitude)*magnitude)
 const max = Math.max(step,Math.ceil(highest/step)*step)
 const ticks = Array.from({length:Math.round(max/step)+1},(_,index)=>max-index*step)
 const label = metric==='meters' ? 'Distance (km)' : metric==='seconds' ? 'Time' : 'Completed walks'
 const format = (value:number) => new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(value)
 const unit = period === 'day' ? 'hour' : period === 'year' ? 'month' : period === 'week' ? 'day of the week' : 'day'
 const tooltipValue = (bucket: typeof buckets[number]) => metric==='meters' ? `${format(bucket.meters/1000)} km` : metric==='seconds' ? timeLabel(bucket.seconds) : `${bucket.count} ${bucket.count===1?'walk':'walks'}`
 const periodLabel = (value:string) => period==='month' ? `Day ${value}` : value
 const axisLabel = (value:number) => metric==='seconds' ? timeLabel(value*60) : format(value)
 const total = buckets.reduce((sum,bucket)=>sum+bucket.count,0)
 if(!total)return <p className="walk-chart-empty" role="status"><strong>No completed walks in this period.</strong></p>
 return <figure className="walk-summary-chart" aria-label={`${label} by ${unit}`}>
  <figcaption><span>Walks by {unit}</span><WalkFilterSelect className="walk-measure-select" label="Statistics measure" value={metric} onChange={value=>setMetric(value as typeof metric)} options={[{value:'count',label:'Completed walks'},{value:'meters',label:'Distance (km)'},{value:'seconds',label:'Time'}]}/></figcaption>
  <div className="walk-chart-scroll"><div className={`walk-chart-plot walk-chart-plot-${period}`}>
  <div className="walk-chart-grid" aria-hidden="true">{ticks.map(tick=><div key={tick} style={{bottom:`${tick/max*100}%`}}><span>{axisLabel(tick)}</span></div>)}</div>
  <div className={`walk-chart-bars ${period==='day'?'walk-chart-daily':''}`} style={period==='day'?undefined:{gridTemplateColumns:`repeat(${buckets.length}, minmax(0, 1fr))`}}>
   {buckets.map((bucket)=><div className="walk-chart-column" key={bucket.label} style={'minute' in bucket?{left:`${Number(bucket.minute)/1440*100}%`}:undefined}>
    <div className="walk-chart-track" tabIndex={0} role="img" aria-label={`${periodLabel(bucket.label)}: ${tooltipValue(bucket)}`}><span className="walk-chart-bar" style={{height:`${valueOf(bucket)/max*100}%`}}/><span className="walk-chart-tooltip">{periodLabel(bucket.label)} · {tooltipValue(bucket)}</span></div>
    {period!=='day'&&<span className="walk-chart-tick" aria-hidden="true">{bucket.label}</span>}
   </div>)}
  </div>
  {period==='day'&&<div className="walk-chart-hour-ticks" aria-hidden="true">{Array.from({length:24},(_,hour)=><span key={hour} style={{left:`${hour/24*100}%`}}>{hour===0?'00':hour}h</span>)}</div>}
  </div></div><p className="walk-chart-unit">{label}</p>
 </figure>
}
