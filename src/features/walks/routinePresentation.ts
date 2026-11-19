import type { Walk } from '../../lib/supabase/database.types'
import type { DailySlot, DailyCheck } from './dailyWalks'
import { localDay } from './gps'
export function nextRoutineSlot(slots:DailySlot[]){return slots.find(slot=>!slot.walk&&!slot.manual)}
export function completedToday(walks:Walk[],day:string,zone:string){return [...new Map(walks.map(walk=>[walk.id,walk])).values()].filter(walk=>!walk.deleted_at&&walk.ended_at&&localDay(walk.ended_at,zone)===day)}
export function lastRecordedStart(walks:Walk[]){return walks.filter(walk=>!walk.deleted_at).sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at))[0]?.started_at}

export function recordedWalksToday(walks:Walk[],checks:DailyCheck[],day:string,zone:string){return completedToday(walks,day,zone).length+new Map(checks.filter(check=>check.local_day===day&&!check.deleted_at).map(check=>[check.id,check])).size}

/** Count actual starts once, including an ongoing walk, in the household-local day. */
export function startedToday(walks:Walk[],day:string,zone:string){return [...new Map(walks.map(walk=>[walk.id,walk])).values()].filter(walk=>!walk.deleted_at&&localDay(walk.started_at,zone)===day)}
