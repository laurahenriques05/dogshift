import { RestoreWalkDialog } from './RestoreWalkDialog'
import { WalkFilterSelect } from './WalkFilterSelect'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WalkPeriodSelect } from './WalkPeriodSelect'
import { Footprints } from 'lucide-react'
import { Button, EmptyState, LoadingPlaceholder, Notice, PageTitle } from '../../components/ui'
import { filterHistory, walkHistory, type HistoryEntry, type HistoryPeriod } from './history'
import { WalkActivityCard } from './WalkActivityCard'


export function WalkHistoryPage({ history, deletedHistory = [], timezone, loading, ready, error, onRetry }: {
 history: HistoryEntry[]; deletedHistory?: HistoryEntry[]; timezone: string; loading: boolean; ready: boolean; error: string; onRetry: () => void | Promise<void>
}) {
 const [restoring, setRestoring] = useState<string | null>(null)
 const [deleting, setDeleting] = useState<string | null>(null)
 const [notice, setNotice] = useState('')
 const [limit, setLimit] = useState(20)
 const [period, setPeriod] = useState<HistoryPeriod>('month')
 const [search, setSearch] = useSearchParams()
 const status = search.get('status') === 'examples' ? 'examples' : search.get('status') === 'deleted' ? 'deleted' : 'saved'
 function setStatus(value: string) {
  const next = new URLSearchParams(search)
  if (value === 'saved') next.delete('status'); else next.set('status', value)
  setSearch(next, { replace: true })
 }
 const source = status === 'examples' ? walkHistory([],true,'') : status === 'deleted' ? deletedHistory : history
 const selected = filterHistory(source, period, timezone)
 return <div className="walk-page walk-history-page"><Link to="/walks">← Walks</Link><div className="walk-diary-heading"><PageTitle eyebrow="YOUR WALKING DIARY" title="Past Adventures"/><div className="walk-history-filters"><WalkPeriodSelect label="Walking history period" value={period} onChange={value=>{setPeriod(value);setLimit(20)}}/><WalkFilterSelect label="Walking history status" value={status} options={[{value:'saved',label:'Not deleted'},{value:'deleted',label:'Deleted'},{value:'examples',label:'Demo walks'}]} onChange={value=>{setStatus(value);setLimit(20)}}/></div></div>
  {notice && <p role="status">{notice}</p>}
  {status !== 'examples' && error && <Notice error>{error}<p><Button className="secondary" onClick={onRetry}>Retry connection</Button></p></Notice>}
  {status !== 'examples' && loading ? <section className="card"><LoadingPlaceholder label="Loading your walking history" lines={3}/></section> : status !== 'examples' && !ready ? <section className="card"><EmptyState icon={<Footprints size={20} strokeWidth={1.8}/>} title="Walking history is not available" action={<Button className="secondary" onClick={onRetry}>Retry connection</Button>}>Reconnect to load the walks saved for this family.</EmptyState></section> : <section className="card">
   {!source.length ? <EmptyState icon={<Footprints size={20} strokeWidth={1.8}/>} title={status === 'deleted' ? 'No deleted walks' : 'Your walking diary starts here'}>{status === 'deleted' ? 'Only walks deleted by you appear here.' : 'Complete a walk and its route, duration and distance will appear here.'}</EmptyState> : !selected.length ? <EmptyState title={status === 'deleted' ? 'No deleted walks in this period' : 'No walks in this period'}>Choose another time period to see earlier completed walks.</EmptyState> : <div className="walk-activity-list">{selected.slice(0,limit).map(walk => <WalkActivityCard key={walk.id} {...walk} loadRoute={!walk.demo} onDelete={walk.own && !walk.demo && !walk.deleted ? () => {setNotice('');setDeleting(walk.id)} : undefined} onRestore={walk.deleted ? () => {setNotice('');setRestoring(walk.id)} : undefined}/>)}</div>}
   {selected.length > limit && <Button className="secondary" onClick={() => setLimit(value => value + 20)}>Load more walks</Button>}
  </section>}
  {deleting && <RestoreWalkDialog action="delete" walkId={deleting} onCancel={() => setDeleting(null)} onRestored={async () => { await onRetry(); setDeleting(null); setNotice('Walk deleted from family history.'); }}/>}
  {restoring && <RestoreWalkDialog walkId={restoring} onCancel={() => setRestoring(null)} onRestored={async () => { await onRetry(); setStatus('saved'); setLimit(20); setRestoring(null); setNotice('Walk restored to your history.'); }}/>}
 </div>
}
