import type { Walk } from '../../lib/supabase/database.types'
import { walkHistory } from './history'
export const WALK_HISTORY_MS = 7 * 24 * 60 * 60 * 1000
export function isRecentWalk(walk: Pick<Walk,'ended_at'>, now = Date.now()) {
 const ended = walk.ended_at ? Date.parse(walk.ended_at) : NaN
 return Number.isFinite(ended) && ended >= now - WALK_HISTORY_MS && ended <= now
}
export function memberWalkTitle(id: string | null, names: ReadonlyMap<string,string>) {
 return `${(id ? names.get(id)?.trim() : '') || 'Family member'}'s Walk`
}
export function recentWalkHistory(walks: Walk[], user: string, names: ReadonlyMap<string,string>, now = Date.now()) {
 const recent = walks.filter(walk => isRecentWalk(walk,now))
 const authors = new Map(recent.map(walk => [walk.id,walk.walker_id]))
 return walkHistory(recent,false,user).map(entry => ({...entry,title:memberWalkTitle(authors.get(entry.id)!,names)}))
}
