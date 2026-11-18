import { db } from '../../lib/supabase/client'
import type { TaskOccurrence, TaskSeries } from '../../lib/supabase/database.types'

type Page<T> = { data: T[] | null; error: unknown }
export async function readTaskPages<T>(page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
 const rows: T[] = []
 for (let offset = 0; ; offset += 500) {
  const result = await page(offset, offset + 499)
  if (result.error) throw result.error
  const values = result.data || []
  rows.push(...values)
  if (values.length < 500) return rows
 }
}

export async function loadTaskData(householdId: string, requestedOccurrence?: string | null) {
 const now = Date.now()
 const from = new Date(now - 90 * 86400000).toISOString()
 const until = new Date(now + 180 * 86400000).toISOString()
 const generated = await db().rpc('generate_task_occurrences', { p_household: householdId, p_from: from, p_until: until })
 if (generated.error) throw generated.error
 const [series, occurrences, members] = await Promise.all([
  readTaskPages<TaskSeries>((start, end) => db().from('task_series').select('*').eq('household_id', householdId).order('first_due_at').order('id').range(start, end)),
  // Retain all open dates, including older overdue and far-future work. Only
  // completed history is bounded, rather than silently hiding pending tasks.
  readTaskPages<TaskOccurrence>((start, end) => db().from('task_occurrences').select('*').eq('household_id', householdId).or(`completed_at.is.null,completed_at.gte.${from}`).order('due_at').order('id').range(start, end)),
  db().rpc('get_household_members', { p_household: householdId }),
 ])
 if (members.error) throw members.error
 // A source link can target completed history older than the default view.
 if (requestedOccurrence && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestedOccurrence) && !occurrences.some(row => row.id === requestedOccurrence)) {
  const requested = await db().from('task_occurrences').select('*').eq('household_id', householdId).eq('id', requestedOccurrence).maybeSingle()
  if (requested.error) throw requested.error
  if (requested.data) occurrences.push(requested.data)
 }
 return { series, occurrences, members: members.data || [] }
}
