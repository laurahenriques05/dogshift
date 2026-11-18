import type { TaskOccurrence,TaskSeries } from '../../lib/supabase/database.types'
import { localTime } from '../health/time'

export type TaskRow=TaskOccurrence&{task:TaskSeries}
export function groupTasks(rows:TaskRow[],zone:string,now=new Date()) {
 const today=localTime(now.toISOString(),zone).slice(0,10)
 const sorted=[...rows].sort((a,b)=>a.due_at.localeCompare(b.due_at)||a.id.localeCompare(b.id))
 return {
  today:sorted.filter(row=>!row.completed_at&&localTime(row.due_at,zone).slice(0,10)===today),
  overdue:sorted.filter(row=>!row.completed_at&&localTime(row.due_at,zone).slice(0,10)<today),
  upcoming:sorted.filter(row=>!row.completed_at&&localTime(row.due_at,zone).slice(0,10)>today),
  completed:sorted.filter(row=>!!row.completed_at).sort((a,b)=>b.completed_at!.localeCompare(a.completed_at!)),
 }
}
