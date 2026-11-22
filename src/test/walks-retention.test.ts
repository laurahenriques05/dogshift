import { expect,it } from 'vitest'
import type { Walk } from '../lib/supabase/database.types'
import { isRecentWalk,memberWalkTitle,recentWalkHistory,WALK_HISTORY_MS } from '../features/walks/retention'
const now=Date.parse('2026-11-22T21:00:00Z')
const walk=(id:string,ended:number|null,extra:Partial<Walk>={}):Walk=>({id,household_id:'h',dog_id:'d',walker_id:'carol',started_at:new Date(now-10*86400000).toISOString(),ended_at:ended===null?null:new Date(ended).toISOString(),distance_m:100,notes:'',end_reason:ended===null?null:'manual',deleted_at:null,...extra})
it('uses a rolling 168 hours since completion, including the boundary and long outings',()=>{
 expect(isRecentWalk(walk('boundary',now-WALK_HISTORY_MS),now)).toBe(true)
 expect(isRecentWalk(walk('expired',now-WALK_HISTORY_MS-1),now)).toBe(false)
 expect(isRecentWalk(walk('long',now-1000),now)).toBe(true)
 expect(isRecentWalk(walk('active',null),now)).toBe(false)
 expect(isRecentWalk(walk('future',now+1),now)).toBe(false)
})
it('labels real recent family walks by member, excluding deleted/expired/active records',()=>{
 const names=new Map([['carol','Carol'],['laura','Laura']])
 const source=[walk('own',now-1000),walk('family',now-2000,{walker_id:'laura'}),walk('old',now-WALK_HISTORY_MS-1),walk('active',null),walk('deleted',now-1000,{deleted_at:new Date(now).toISOString()})]
 expect(recentWalkHistory(source,'carol',names,now).map(w=>[w.id,w.title])).toEqual([['family',"Laura's Walk"],['own',"Carol's Walk"]])
 expect(memberWalkTitle(null,names)).toBe("Family member's Walk")
 expect(source).toHaveLength(5)
})
