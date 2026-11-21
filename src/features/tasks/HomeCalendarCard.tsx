import { calendarEventLabel } from './calendarTopics'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, ChevronRight } from 'lucide-react'
import { Button, LoadingPlaceholder, Notice, errorMessage } from '../../components/ui'
import { loadCalendarEvents } from './calendarData'
import { eventOnDate, type CalendarEvent } from './model'


function dateForZone(zone: string) {
 return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function addDays(date: string, amount: number) {
 const value = new Date(`${date}T12:00:00Z`)
 value.setUTCDate(value.getUTCDate() + amount)
 return value.toISOString().slice(0, 10)
}

function eventTime(event: CalendarEvent, zone: string) {
 if(event.timeLabel)return event.timeLabel
 if (event.allDay) return 'All day'
 return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(event.occursAt))
}

export function HomeCalendarCard({ householdId, zone }: { householdId: string; zone: string }) {
 const today = useMemo(() => dateForZone(zone), [zone])
 const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(today, index)), [today])
 const months = useMemo(() => [...new Set(days.map(day => day.slice(0, 7)))], [days])
 const [selected, setSelected] = useState(today)
 const [events, setEvents] = useState<CalendarEvent[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [retry, setRetry] = useState(0)

 const load = useCallback(async () => {
  setLoading(true)
  setError('')
  try {
   const results = await Promise.all(months.map(month => loadCalendarEvents(householdId, zone, month)))
   setEvents([...new Map(results.flat().map(event => [event.id, event])).values()].sort((a, b) => a.occursAt.localeCompare(b.occursAt)))
  } catch (caught) {
   setError(errorMessage(caught))
  } finally {
   setLoading(false)
  }
 }, [householdId, months, zone])

 useEffect(() => { void load() }, [load, retry])

 const selectedEvents = events.filter(event => eventOnDate(event, selected, zone))
 const selectedLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${selected}T12:00:00Z`))

 return <section className="card home-calendar-card" aria-labelledby="home-calendar-title" aria-busy={loading}>
  <header className="home-calendar-heading">
   <div className="home-card-heading">
    <span className="icon-tile"><CalendarDays size={20}/></span>
    <div><p className="eyebrow">THE NEXT SEVEN DAYS</p><h3 id="home-calendar-title">Shared calendar</h3></div>
   </div>
   <Link className="text-link" to="/calendar">Open calendar <ArrowUpRight size={15}/></Link>
  </header>

  {loading ? <LoadingPlaceholder label="Loading your family calendar" lines={2}/> : error ? <div className="home-calendar-error"><Notice error>{error}</Notice><Button className="secondary" onClick={() => setRetry(value => value + 1)}>Reload calendar</Button></div> : <>
   <div className="home-calendar-days" aria-label="Choose a day in the next week">
    {days.map(day => {
     const date = new Date(`${day}T12:00:00Z`)
     const count = events.filter(event => eventOnDate(event, day, zone)).length
     return <button type="button" key={day} className={day === selected ? 'selected' : ''} aria-pressed={day === selected} aria-label={`${new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }).format(date)}, ${count} ${count === 1 ? 'event' : 'events'}`} onClick={() => setSelected(day)}>
      <span>{new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(date)}</span>
      <strong>{date.getUTCDate()}</strong>
      <i className={count ? 'has-events' : ''} aria-hidden="true"/>
     </button>
    })}
   </div>

   <div className="home-calendar-agenda">
    <h4>{selected === today ? 'Today' : selectedLabel}</h4>
    {selectedEvents.length === 0 ? <p className="muted">Nothing planned for this day. Your family can add tasks and appointments from the full calendar.</p> : <ul>
     {selectedEvents.slice(0, 3).map(event => <li key={event.id}>
      <Link to={event.href}>
       <span className={`calendar-event-dot calendar-dot-${event.source}`} aria-hidden="true"/>
       <div><strong>{event.title}</strong><small>{eventTime(event, zone)} · {calendarEventLabel(event)}{event.status?` · ${event.status}`:''}</small></div>
       <ChevronRight size={17} aria-hidden="true"/>
      </Link>
     </li>)}
    </ul>}
    {selectedEvents.length > 3 && <Link className="home-calendar-more" to="/calendar">See {selectedEvents.length - 3} more</Link>}
   </div>
  </>}
 </section>
}
