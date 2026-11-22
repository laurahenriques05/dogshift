import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Footprints } from 'lucide-react'
import { Button, EmptyState, LoadingPlaceholder, Notice, PageTitle } from '../../components/ui'
import type { HistoryEntry } from './history'
import { WalkActivityCard } from './WalkActivityCard'
export function WalkHistoryPage({ history, loading, ready, error, onRetry,areaScope='' }: {
 areaScope?:string; history: HistoryEntry[]; timezone: string; loading: boolean; ready: boolean; error: string; onRetry: () => void | Promise<void>
}) {
 const [limit,setLimit]=useState(20)
 return <div className="walk-page walk-history-page"><Link to="/walks">← Walks</Link><PageTitle eyebrow="YOUR WALKING DIARY" title="Past Adventures">Completed walks from the last 7 days.</PageTitle>
  {error&&<Notice error>{error}<p><Button className="secondary" onClick={onRetry}>Retry connection</Button></p></Notice>}
  {loading?<section className="card"><LoadingPlaceholder label="Loading your walking history" lines={3}/></section>:!ready?<section className="card"><EmptyState title="Walking history is not available" action={<Button className="secondary" onClick={onRetry}>Retry connection</Button>}>Reconnect to load your family’s walks.</EmptyState></section>:<section className="card">
   {!history.length?<EmptyState icon={<Footprints size={20}/>} title="No walks in the last 7 days">Your next completed walk will appear here.</EmptyState>:<div className="walk-activity-list">{history.slice(0,limit).map(walk=><WalkActivityCard areaScope={areaScope} key={walk.id} {...walk} loadRoute/>)}</div>}
   {history.length>limit&&<Button className="secondary" onClick={()=>setLimit(value=>value+20)}>Load more walks</Button>}
  </section>}
 </div>
}
