import type { Walk } from '../../lib/supabase/database.types'
import { demoWalks } from './demo'
import { duration, localDay, periodStart, type Point } from './gps'
export type HistoryEntry = { id: string; title: string; startedAt: string; meters: number; seconds: number; demo: boolean; points?: Point[]; location?: string }

export const presentationHistoryEnabled = () => import.meta.env.DEV
export type HistoryPeriod = 'day' | 'week' | 'month' | 'year'

/** Calendar periods use the household timezone, including its Monday-based week. */
export function filterHistory(entries: HistoryEntry[], period: HistoryPeriod, timezone: string, now = new Date()) {
 const today = localDay(now.toISOString(), timezone)
 const start = period === 'year' ? `${today.slice(0, 4)}-01-01` : periodStart(period, timezone, now)
 return entries.filter(entry => { const day = localDay(entry.startedAt, timezone); return day >= start && day <= today })
}

/** View-only demo history; never modifies household records or Home statistics. */
export function walkHistory(walks: Walk[], includeExamples: boolean, user: string): HistoryEntry[] {
 const saved: HistoryEntry[] = walks.filter(walk => walk.ended_at && !walk.deleted_at).map(walk => ({
  id: walk.id, title: `${walk.walker_id === user ? 'Your walk' : 'Family walk'}${walk.end_reason === 'stationary' ? ' · Automatically ended' : ''}`,
  startedAt: walk.started_at, meters: walk.distance_m, seconds: duration(walk), demo: false,
 }))
 const examples = includeExamples ? demoWalks.map(walk => ({ ...walk, demo: true })) : []
 return [...saved, ...examples].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id))
}
export function summarizeHistory(entries: HistoryEntry[], period: HistoryPeriod, timezone: string, now = new Date()) {
 const selected = filterHistory(entries, period, timezone, now)
 return selected.reduce((total, entry) => ({ count: total.count + 1, meters: total.meters + entry.meters, seconds: total.seconds + entry.seconds }), { count: 0, meters: 0, seconds: 0 })
}

/** Zero-filled calendar buckets share the exact same filtered source as the totals. */
export function historyChart(entries: HistoryEntry[], period: HistoryPeriod, timezone: string, now = new Date()) {
 const today = localDay(now.toISOString(), timezone)
 const start = period === 'year' ? `${today.slice(0,4)}-01-01` : periodStart(period, timezone, now)
 const date = new Date(`${start}T12:00:00Z`)
 const days = period === 'week' ? 7 : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0)).getUTCDate()
 const size = period === 'day' ? 24 : period === 'year' ? 12 : days
 const buckets = Array.from({length:size}, (_, index) => {
  const day = new Date(date)
  day.setUTCDate(date.getUTCDate()+index)
  const label = period === 'day' ? `${String(index).padStart(2,'0')}:00` : period === 'year' ? new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(date.getUTCFullYear(),index,1))) : period === 'week' ? new Intl.DateTimeFormat('en',{weekday:'short',timeZone:'UTC'}).format(day) : String(index+1)
  return {label, count:0, meters:0, seconds:0}
 })
 for (const entry of filterHistory(entries,period,timezone,now)) {
  const day = localDay(entry.startedAt,timezone)
  const index = period === 'day' ? Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date(entry.startedAt))) : period === 'year' ? Number(day.slice(5,7))-1 : Math.round((Date.parse(`${day}T12:00:00Z`)-date.getTime())/86400000)
  const bucket = buckets[index]
  bucket.count++; bucket.meters+=entry.meters; bucket.seconds+=entry.seconds
 }
 return buckets
}

/** Daily bars retain local start minutes instead of rounding walks down to an hour. */
export function dailyHistoryChart(entries: HistoryEntry[], timezone: string, now = new Date()) {
 const grouped = new Map<number, {label:string; minute:number; count:number; meters:number; seconds:number}>()
 const clock = new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
 for (const entry of filterHistory(entries,'day',timezone,now)) {
  const label = clock.format(new Date(entry.startedAt))
  const [hour,minutePart] = label.split(':').map(Number)
  const minute = hour*60+minutePart
  const bucket = grouped.get(minute) ?? {label,minute,count:0,meters:0,seconds:0}
  bucket.count++; bucket.meters+=entry.meters; bucket.seconds+=entry.seconds
  grouped.set(minute,bucket)
 }
 return [...grouped.values()].sort((a,b)=>a.minute-b.minute)
}
