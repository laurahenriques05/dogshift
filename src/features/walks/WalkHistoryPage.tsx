import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Footprints } from 'lucide-react'
import { WalkPeriodSelect } from './WalkPeriodSelect'
import { Button, EmptyState, LoadingPlaceholder, Notice, PageTitle } from '../../components/ui'
import { filterHistory, type HistoryEntry, type HistoryPeriod } from './history'
import { WalkActivityCard } from './WalkActivityCard'


export function WalkHistoryPage({ history, timezone, loading, ready, error, onRetry }: {
 history: HistoryEntry[]; timezone: string; loading: boolean; ready: boolean; error: string; onRetry: () => void
}) {
 const [limit, setLimit] = useState(20)
 const [period, setPeriod] = useState<HistoryPeriod>('month')
 const selected = filterHistory(history, period, timezone)
 return <div className="walk-page walk-history-page"><Link to="/walks">← Walks</Link><div className="walk-diary-heading"><PageTitle eyebrow="YOUR WALKING DIARY" title="Past Adventures"/><WalkPeriodSelect label="Walking history period" value={period} onChange={value=>{setPeriod(value);setLimit(20)}}/></div>
  {error && <Notice error>{error}<p><Button className="secondary" onClick={onRetry}>Retry connection</Button></p></Notice>}
  {loading ? <section className="card"><LoadingPlaceholder label="Loading your walking history" lines={3}/></section> : !ready ? <section className="card"><EmptyState icon={<Footprints size={20} strokeWidth={1.8}/>} title="Walking history is not available" action={<Button className="secondary" onClick={onRetry}>Retry connection</Button>}>Reconnect to load the walks saved for this family.</EmptyState></section> : <section className="card">
   {!history.length ? <EmptyState icon={<Footprints size={20} strokeWidth={1.8}/>} title="Your walking diary starts here">Complete a walk and its route, duration and distance will appear here.</EmptyState> : !selected.length ? <EmptyState title="No walks in this period">Choose another time period to see earlier completed walks.</EmptyState> : <div className="walk-activity-list">{selected.slice(0,limit).map(walk => <WalkActivityCard key={walk.id} {...walk} loadRoute={!walk.demo}/>)}</div>}
   {selected.length > limit && <Button className="secondary" onClick={() => setLimit(value => value + 20)}>Load more walks</Button>}
  </section>}
 </div>
}
