import './tasks.css'
import { calendarTopics,calendarEventLabel,matchesCalendarTopic,type CalendarTopic } from './calendarTopics'
import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft,ChevronRight,Plus,Utensils,Footprints } from 'lucide-react'
import { Button,Notice,PageTitle,errorMessage } from '../../components/ui'
import { useHousehold } from '../household/HouseholdProvider'
import { loadCalendarEvents } from './calendarData'
import { eventOnDate,shiftMonth,type CalendarEvent } from './model'

function dateForZone(zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function startMonth(date:string){return date.slice(0,7)}
function monthDays(month:string){const [year,number]=month.split('-').map(Number);const count=new Date(Date.UTC(year,number,0)).getUTCDate();const padding=(new Date(Date.UTC(year,number-1,1)).getUTCDay()+6)%7;return{count,padding}}
function careState(event:CalendarEvent){return event.completed?'Completed':Date.parse(event.occursAt)<Date.now()?'Overdue':'Pending'}
function eventTime(event:CalendarEvent,zone:string){return event.timeLabel|| (event.allDay?'All day':new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(event.occursAt)))}
export function CalendarPage(){
 const {household}=useHousehold();const zone=household?.timezone||'UTC';const today=dateForZone(zone)
 const [month,setMonth]=useState(()=>startMonth(today)),[selected,setSelected]=useState(today),[events,setEvents]=useState<CalendarEvent[]>([])
 const [topic,setTopic]=useState<CalendarTopic>('all'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const requestVersion=useRef(0),[,refreshClock]=useState(0)
 const load=useCallback(async()=>{if(!household)return;const request=++requestVersion.current;setLoading(true);setEvents([]);setError('');try{const result=await loadCalendarEvents(household.id,zone,month);if(request===requestVersion.current)setEvents(result)}catch(e){if(request===requestVersion.current)setError(errorMessage(e))}finally{if(request===requestVersion.current)setLoading(false)}},[household?.id,zone,month])
 useEffect(()=>{void load();return()=>{requestVersion.current++}},[load,retry])
 useEffect(()=>{const timer=window.setInterval(()=>refreshClock(value=>value+1),60000);return()=>window.clearInterval(timer)},[])
 useEffect(()=>{const refresh=()=>void load();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[load])
 const visible=useMemo(()=>events.filter(event=>!error&&matchesCalendarTopic(event,topic)),[events,topic,error])
 const selectedEvents=visible.filter(event=>eventOnDate(event,selected,zone))
 const {count,padding}=monthDays(month)
 const monthLabel=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`))
 function changeMonth(value:string){setMonth(value);setSelected(value===startMonth(today)?today:`${value}-01`)}
 return <div className="calendar-page"><PageTitle eyebrow="YOUR FAMILY" title="Tasks and calendar">Plan care together in your household time zone · {zone}</PageTitle>
  <nav className="task-hub-nav" aria-label="Tasks and calendar"><Link to="/tasks">Tasks</Link><Link className="is-active" to="/calendar" aria-current="page">Calendar</Link></nav>
  {error&&<Notice error>{error}</Notice>}
  <section className="card shared-calendar" aria-label="Shared household calendar">
   <div className="shared-calendar-toolbar"><button type="button" onClick={()=>changeMonth(startMonth(today))}>Today</button><div className="shared-calendar-links"><Link to="/tasks?new=1"><Plus size={15}/>Add a task</Link><Link to="/health/appointments"><Plus size={15}/>Add appointment</Link></div></div>
   <div className="shared-calendar-month"><button type="button" aria-label="Previous month" onClick={()=>changeMonth(shiftMonth(month,-1))}><ChevronLeft/></button><h2 aria-live="polite">{monthLabel}</h2><button type="button" aria-label="Next month" onClick={()=>changeMonth(shiftMonth(month,1))}><ChevronRight/></button></div>
   <fieldset className="calendar-filters"><legend>Show</legend>{calendarTopics.map(filter=><label key={filter.id}><input type="radio" name="calendar-topic" checked={topic===filter.id} onChange={()=>setTopic(filter.id)}/>{filter.label}</label>)}</fieldset>
   <div className="shared-calendar-scroll" tabIndex={0} aria-label="Month calendar, scroll horizontally on small screens"><div className="shared-calendar-grid">
    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span className="calendar-weekday" key={day}>{day}</span>)}
    {Array.from({length:padding},(_,index)=><span key={`pad-${index}`} aria-hidden="true"/>)}
    {Array.from({length:count},(_,index)=>{const day=`${month}-${String(index+1).padStart(2,'0')}`;const onDay=visible.filter(event=>eventOnDate(event,day,zone));return <div className="shared-calendar-cell" key={day}><button type="button" className={`shared-calendar-day ${day===selected?'selected':''} ${day===today?'today':''}`} aria-pressed={day===selected} aria-current={day===today?'date':undefined} aria-label={`${day}, ${onDay.length} events`} onClick={()=>setSelected(day)}><span>{index+1}</span>{onDay.length>0&&<small>{onDay.length} {onDay.length===1?'event':'events'}</small>}</button>{onDay.slice(0,2).map(event=><Link className={`calendar-event calendar-${event.source} ${event.completed?'calendar-completed':''} ${event.careKind?`care-${event.careKind}`:''} ${event.careKind&&!event.completed&&(careState(event)==='Overdue'||!event.assignedTo)?'care-attention':''}`} to={event.href} key={event.id} title={event.title}><time>{eventTime(event,zone)}</time><span>{event.title}</span><small>{calendarEventLabel(event)}{event.estimated?' · estimated':''}{event.status?` · ${event.status}`:''}</small>{event.careKind&&<small>{event.assigneeName} · {careState(event)}</small>}</Link>)}{onDay.length>2&&<button className="calendar-more" type="button" onClick={()=>setSelected(day)}>+{onDay.length-2} more</button>}</div>})}
   </div></div>
   {loading?<p role="status" className="calendar-load">Loading shared events…</p>:<section className="calendar-day-list" aria-live="polite"><h3>{new Intl.DateTimeFormat(undefined,{dateStyle:'full',timeZone:'UTC'}).format(new Date(`${selected}T12:00:00Z`))}</h3>{selectedEvents.length===0?<p className="muted">No shared events for this day.</p>:<ul>{selectedEvents.map(event=><li key={event.id}><Link to={event.href}>{event.careKind?<span aria-hidden="true">{event.careKind==='feeding'?<Utensils size={18}/>:<Footprints size={18}/>}</span>:<span className={`calendar-event-dot calendar-dot-${event.source}`}/>} <div><strong>{event.title}</strong><small>{eventTime(event,zone)} · {event.careKind?`${calendarEventLabel(event)} · ${event.assigneeName} · ${careState(event)}`:`${calendarEventLabel(event)}${event.estimated?' · estimated':''}${event.status?` · ${event.status}`:''}`}</small></div><ChevronRight size={17}/></Link></li>)}</ul>}</section>}
  </section>
  {error&&<Button className="secondary" onClick={()=>setRetry(value=>value+1)}>Retry loading calendar</Button>}
  <p className="calendar-footer-note">Routines update from Feeding and Walks. Add a task for extra care. Estimated routines are shown from today onwards; earlier days show saved activities. Each item opens its source feature.</p>
 </div>
}
