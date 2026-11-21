import { getDeletedWalkHistory } from './api'
import { RestoreWalkDialog } from './RestoreWalkDialog'
import { WalkFilterSelect } from './WalkFilterSelect'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WalkPeriodSelect } from './WalkPeriodSelect'
import { Footprints } from 'lucide-react'
import { Button, EmptyState, LoadingPlaceholder, Notice, PageTitle, isSchemaUnavailable } from '../../components/ui'
import { filterHistory, walkHistory, type HistoryEntry, type HistoryPeriod } from './history'
import { WalkActivityCard } from './WalkActivityCard'


export function WalkHistoryPage({ history, deletedHistory = [], timezone, loading, ready, error, onRetry,householdId,areaScope='' }: {
 householdId?:string; areaScope?:string; history: HistoryEntry[]; deletedHistory?: HistoryEntry[]; timezone: string; loading: boolean; ready: boolean; error: string; onRetry: () => void | Promise<void>
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
 const [familyDeleted,setFamilyDeleted]=useState<HistoryEntry[]|null>(null),[deletedLoading,setDeletedLoading]=useState(false),[deletedError,setDeletedError]=useState(''),[deletedSetupPending,setDeletedSetupPending]=useState(false),[deletedRevision,setDeletedRevision]=useState(0)
 useEffect(()=>{
  if(status!=='deleted'||!householdId)return
  let live=true;setDeletedLoading(true);setDeletedError('');setDeletedSetupPending(false);setFamilyDeleted(null)
  void getDeletedWalkHistory(householdId,areaScope).then(rows=>{if(live)setFamilyDeleted(rows)}).catch(error=>{if(live){const setup=isSchemaUnavailable(error);setDeletedSetupPending(setup);setDeletedError(setup?'Family deleted history is not available yet. Any of your deleted walks are shown below. Saved history is still available.':'Deleted family history is unavailable. Try again.')}}).finally(()=>{if(live)setDeletedLoading(false)})
  return()=>{live=false}
 },[householdId,areaScope,status,deletedRevision])
 const source = status === 'examples' ? walkHistory([],true,'') : status === 'deleted' ? familyDeleted??deletedHistory : history
 const selected = filterHistory(source, period, timezone)
 return <div className="walk-page walk-history-page"><Link to="/walks">← Walks</Link><div className="walk-diary-heading"><PageTitle eyebrow="YOUR WALKING DIARY" title="Past Adventures"/><div className="walk-history-filters"><WalkPeriodSelect label="Walking history period" value={period} onChange={value=>{setPeriod(value);setLimit(20)}}/><WalkFilterSelect label="Walking history status" value={status} options={[{value:'saved',label:'Not deleted'},{value:'deleted',label:'Deleted'},{value:'examples',label:'Demo walks'}]} onChange={value=>{setStatus(value);setLimit(20)}}/></div></div>
  {status==='deleted'&&deletedLoading&&<p role="status">Loading deleted family walks…</p>}
  {status==='deleted'&&deletedError&&<Notice error={!deletedSetupPending}>{deletedError}<p>{!deletedSetupPending&&<><Button className="secondary" onClick={()=>setDeletedRevision(value=>value+1)}>Retry deleted history</Button>{' '}</>}<Button className="secondary" onClick={()=>setStatus('saved')}>View saved walks</Button></p></Notice>}
  {notice && <p role="status">{notice}</p>}
  {status !== 'examples' && error && <Notice error>{error}<p><Button className="secondary" onClick={onRetry}>Retry connection</Button></p></Notice>}
  {status !== 'examples' && (loading||status==='deleted'&&deletedLoading&&!source.length) ? <section className="card"><LoadingPlaceholder label="Loading your walking history" lines={3}/></section> : status !== 'examples' && !ready ? <section className="card"><EmptyState icon={<Footprints size={20} strokeWidth={1.8}/>} title="Walking history is not available" action={<Button className="secondary" onClick={onRetry}>Retry connection</Button>}>Reconnect to load the walks saved for this family.</EmptyState></section> : <section className="card">
   {status==='deleted'&&deletedError&&!source.length?<EmptyState title={deletedSetupPending?'Family deleted history is not available yet':'Deleted history unavailable'}>Use View saved walks to open saved history.</EmptyState>:!source.length ? <EmptyState icon={<Footprints size={20} strokeWidth={1.8}/>} title={status === 'deleted' ? 'No deleted walks' : 'Your walking diary starts here'}>{status === 'deleted' ? 'Deleted family walks will appear here.' : 'Complete a walk and its route, duration and distance will appear here.'}</EmptyState> : !selected.length ? <EmptyState title={status === 'deleted' ? 'No deleted walks in this period' : 'No walks in this period'}>Choose another time period to see earlier completed walks.</EmptyState> : <div className="walk-activity-list">{selected.slice(0,limit).map(walk => <WalkActivityCard areaScope={areaScope} key={walk.id} {...walk} loadRoute={!walk.demo&&(!walk.deleted||!!walk.own)} onDelete={!walk.demo ? () => {setNotice('');setDeleting(walk.id)} : undefined} onRestore={walk.deleted&&walk.own ? () => {setNotice('');setRestoring(walk.id)} : undefined}/>)}</div>}
   {selected.length > limit && <Button className="secondary" onClick={() => setLimit(value => value + 20)}>Load more walks</Button>}
  </section>}
  {deleting && <RestoreWalkDialog action={status==='deleted'?'permanent':'delete'} walkId={deleting} onCancel={() => setDeleting(null)} onRestored={async action => { await onRetry(); setDeletedRevision(value=>value+1); setDeleting(null); setNotice(action==='permanent'?'Walk permanently removed.':'Walk deleted from family history.'); }}/>}
  {restoring && <RestoreWalkDialog walkId={restoring} onCancel={() => setRestoring(null)} onRestored={async () => { await onRetry(); setDeletedRevision(value=>value+1); setStatus('saved'); setLimit(20); setRestoring(null); setNotice('Walk restored to your history.'); }}/>}
 </div>
}
