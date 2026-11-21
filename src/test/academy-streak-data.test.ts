import {beforeEach,expect,it,vi} from 'vitest'
import type {AcademyPractice} from '../lib/supabase/database.types'
import {academyProgress} from '../features/academy/progress'
import {loadAcademyPracticeDates} from '../features/academy/data'
const store=vi.hoisted(()=>({rows:[] as {id:string;household_id:string;practiced_at:string;deleted_at:string|null}[],calls:[] as [number,number][],failFrom:-1}))
vi.mock('../lib/supabase/client',()=>({db:()=>({from(table:string){
 expect(table).toBe('academy_practice')
 let home='',live=false
 const builder={
  select(columns:string){expect(columns).toBe('id,practiced_at');return builder},
  eq(column:string,value:string){expect(column).toBe('household_id');home=value;return builder},
  is(column:string,value:null){expect([column,value]).toEqual(['deleted_at',null]);live=true;return builder},
  order(column:string){expect(column).toBe('id');return builder},
  async range(from:number,to:number){
   store.calls.push([from,to])
   if(from===store.failFrom)return {data:null,error:new Error('Source unavailable')}
   return {data:store.rows.filter(r=>r.household_id===home&&(!live||!r.deleted_at)).slice(from,to+1),error:null}
  },
 };return builder
}})}))
beforeEach(()=>{store.rows=[];store.calls=[];store.failFrom=-1})
function add(id:number,at:string,home='family',deleted_at:string|null=null){store.rows.push({id:String(id),practiced_at:at,household_id:home,deleted_at})}
it('counts three days despite more than a thousand practices today and keeps the displayed history independent',async()=>{
 for(let i=0;i<1100;i++)add(i,'2026-11-21T10:00Z')
 add(1100,'2026-11-20T10:00Z');add(1101,'2026-11-19T10:00Z')
 const dates=await loadAcademyPracticeDates('family')
 const recent=store.rows.slice(0,100) as unknown as AcademyPractice[]
 expect(dates).toHaveLength(1102)
 expect(store.calls).toEqual([[0,499],[500,999],[1000,1499]])
 expect(academyProgress(recent,'Europe/Lisbon',new Date('2026-11-21T12:00Z'),[],dates).streak).toBe(3)
 expect(recent).toHaveLength(100)
})
it('allows a genuine streak longer than 100 days, without changing XP milestones',async()=>{
 const now=new Date('2026-11-21T12:00Z')
 for(let i=0;i<150;i++)add(i,new Date(now.getTime()-i*86400000).toISOString())
 const progress=academyProgress([],'Europe/Lisbon',now,[],await loadAcademyPracticeDates('family'))
 expect(progress.streak).toBe(150);expect(progress.xp).toBe(0);expect(progress.completedCount).toBe(0)
})
it('excludes deleted practices and other households and propagates source failures',async()=>{
 add(0,'2026-11-21T10:00Z');add(1,'2026-11-20T10:00Z','other');add(2,'2026-11-20T10:00Z','family','2026-11-21T11:00Z')
 const dates=await loadAcademyPracticeDates('family')
 expect(dates).toEqual([{practiced_at:'2026-11-21T10:00Z'}])
 expect(academyProgress([],'UTC',new Date('2026-11-21T12:00Z'),[],dates).streak).toBe(1)
 store.rows=[];for(let i=0;i<501;i++)add(i,'2026-11-21T10:00Z')
 store.failFrom=500
 await expect(loadAcademyPracticeDates('family')).rejects.toThrow('Source unavailable')
})
it('counts household-local dates once and preserves yesterday grace and a broken streak',()=>{
 const dates=[{practiced_at:'2026-11-21T00:30Z'},{practiced_at:'2026-11-21T00:40Z'},{practiced_at:'2026-11-20T00:30Z'}]
 expect(academyProgress([],'America/New_York',new Date('2026-11-21T00:45Z'),[],dates).streak).toBe(2)
 expect(academyProgress([],'America/New_York',new Date('2026-11-22T00:45Z'),[],dates).streak).toBe(2)
 expect(academyProgress([],'America/New_York',new Date('2026-11-23T00:45Z'),[],dates).streak).toBe(0)
 expect(academyProgress([],'UTC',new Date('2026-11-21T12:00Z'),[],[]).streak).toBe(0)
})
