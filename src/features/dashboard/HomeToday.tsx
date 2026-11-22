import { ArrowRight, Check, Footprints, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LoadingPlaceholder } from '../../components/ui'
import type { Household } from '../../lib/supabase/database.types'
import { todayChecklist } from '../feeding/checklist'
import { dayKey } from '../feeding/model'
import { useFeeding } from '../feeding/useFeeding'
import { useWalks } from '../walks/WalkProvider'
import { timeLabel } from '../walks/gps'

export function HomeToday({ household }: { household: Household; dogName: string }) {
 const feeding=useFeeding(household.id),walks=useWalks(),now=new Date()
 const names=new Map(feeding.members.map(member=>[member.user_id,member.display_name]))
 const meals=todayChecklist(feeding.plan,feeding.events,household.timezone,now)
 const nextMeal=meals.find(row=>!row.event)
 const latestMeal=[...feeding.events].filter(event=>!event.deleted_at).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0]
 const activeWalk=walks.walks.find(walk=>!walk.ended_at&&!walk.deleted_at)
 const latestWalk=walks.walks.find(walk=>walk.ended_at&&!walk.deleted_at)
 const feedingAction=feeding.error?{to:'/feed',label:'Retry Feeding'}:nextMeal?{to:'/feed?quick=1',label:`Feed ${nextMeal.meal.name}`}:{to:'/feed',label:'Open Feeding'}
 const walkAction=walks.error?{to:'/walks',label:'Retry Walks'}:activeWalk?{to:'/walks',label:'Open active walk'}:{to:'/walks',label:'Start a walk'}
 const clock=(value:string)=>new Date(value).toLocaleTimeString(undefined,{timeZone:household.timezone,hour:'2-digit',minute:'2-digit',hour12:false})
 const when=(value:string)=>{const date=new Date(value),today=dayKey(now,household.timezone),key=dayKey(date,household.timezone);if(key===today)return `today at ${clock(value)}`;const yesterday=dayKey(new Date(now.getTime()-86400000),household.timezone);if(key===yesterday)return `yesterday at ${clock(value)}`;return date.toLocaleDateString(undefined,{timeZone:household.timezone,day:'numeric',month:'short'})}
 const loading=feeding.loading||walks.loading
 return <section className="home-today" aria-labelledby="home-today-title">
  <div className="home-today-copy"><h2 id="home-today-title">What is on today's agenda?</h2></div>
  {loading?<div className="card home-today-card"><LoadingPlaceholder label="Loading today’s care" lines={3}/></div>:<div className="card home-today-card">
   <div className="home-today-status">
    <article><div className="home-today-panel-copy"><span className="home-today-icon"><Utensils size={18}/></span><div><strong>Feeding</strong>{feeding.error?<p>Could not load feeding.</p>:latestMeal?<p>Last: {latestMeal.meal_name} {when(latestMeal.occurred_at)} · {names.get(latestMeal.created_by||'')||'family member'}</p>:<p>No meal recorded yet.</p>}</div>{meals.length>0&&meals.every(row=>row.event)&&<Check size={17} className="home-today-check" aria-label="Today’s meals complete"/>}</div><Link className="button home-today-button" to={feedingAction.to}>{feedingAction.label}<ArrowRight size={17}/></Link></article>
    <article><div className="home-today-panel-copy"><span className="home-today-icon peach"><Footprints size={18}/></span><div><strong>Walks</strong>{walks.error?<p>Could not load walks.</p>:activeWalk?<p>Walk in progress · started {when(activeWalk.started_at)} by {names.get(activeWalk.walker_id||'')||'family member'}</p>:latestWalk?<p>Last: {when(latestWalk.started_at)} · {timeLabel((Date.parse(latestWalk.ended_at!)-Date.parse(latestWalk.started_at))/1000)} · {names.get(latestWalk.walker_id||'')||'family member'}</p>:<p>No completed walk yet.</p>}</div></div><Link className="button home-today-button" to={walkAction.to}>{walkAction.label}<ArrowRight size={17}/></Link></article>
   </div>
  </div>}
 </section>
}
