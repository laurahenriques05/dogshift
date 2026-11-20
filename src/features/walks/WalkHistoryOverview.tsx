import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartNoAxesCombined } from 'lucide-react'
import { summarizeHistory, type HistoryEntry, type HistoryPeriod } from './history'
import { kilometersLabel } from './mapGestures'
import { timeLabel } from './gps'
import { WalkPeriodSelect } from './WalkPeriodSelect'
import { WalkSummaryChart } from './WalkSummaryChart'
import { WalkActivityCard } from './WalkActivityCard'

export function WalkHistoryOverview({history,timezone,now,onDelete}:{history:HistoryEntry[];timezone:string;now:Date;onDelete:(id:string)=>void}) {
 const [period,setPeriod]=useState<HistoryPeriod>('month')
 const [showStatistics,setShowStatistics]=useState(true)
 const summary=summarizeHistory(history,period,timezone,now)
 return <div className="walk-history-overview">
  <section className="card walk-together">
   <div className="walk-heading"><div><p className="eyebrow">LITTLE STEPS ADD UP</p><h2>Walking together</h2></div><WalkPeriodSelect label="Summary period" value={period} onChange={setPeriod}/></div>
   <div className="walk-metrics"><div><strong>{summary.count}</strong><span>Completed walks</span></div><div><strong>{kilometersLabel(summary.meters)} km</strong><span>Recorded distance</span></div><div><strong>{timeLabel(summary.seconds)}</strong><span>Total time</span></div></div>
   <div id="walk-statistics" hidden={!showStatistics}><WalkSummaryChart history={history} period={period} timezone={timezone} now={now} compact/></div>
   <div className="walk-statistics-action"><button type="button" className="walk-statistics-toggle" aria-expanded={showStatistics} aria-controls="walk-statistics" onClick={()=>setShowStatistics(value=>!value)}><ChartNoAxesCombined size={18} aria-hidden="true"/>{showStatistics?'Hide statistics':'View statistics'}</button></div>
  </section>
  <section className="card walk-last-adventure">
   <div className="walk-heading walk-history-heading"><h2>Last Adventure</h2><Link className="walk-show-more" to="/walks?view=history">History</Link></div>
   {!history.length?<p className="walk-empty">Your first completed walk will appear here.</p>:<div className="walk-activity-list">{history.slice(0,1).map(walk=><WalkActivityCard key={walk.id} {...walk} loadRoute={!walk.demo} onDelete={!walk.demo?()=>onDelete(walk.id):undefined}/>)}</div>}
  </section>
 </div>
}
