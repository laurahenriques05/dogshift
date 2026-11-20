import {expect,it} from 'vitest'
import type {Walk} from '../lib/supabase/database.types'
import {dailySlots,type DailyCheck} from '../features/walks/dailyWalks'
const times=['09:00','11:00','15:00','21:00'],day='2026-11-20',zone='Europe/Lisbon'
const walk=(id:string,start:string,end:string|null=null,deleted_at:string|null=null)=>({id,started_at:`${day}T${start}:00Z`,ended_at:end?`${day}T${end}:00Z`:null,deleted_at} as Walk)
it('fills an ongoing walk in its actual period without a manual check or inventing completion',()=>{
 const slots=dailySlots(4,[walk('active','15:30')],[],day,zone,times)
 expect(slots.map(s=>s.walk?.id)).toEqual([undefined,undefined,'active',undefined])
 expect(slots[2].walk?.ended_at).toBeNull()
 const ended=dailySlots(4,[walk('active','15:30','16:00')],[],day,zone,times)
 expect(ended[2].walk?.ended_at).toContain('16:00')
})
it('uses chronological real starts once per slot, not proximity to estimated hours',()=>{
 const first=walk('early','07:15','07:40'),second=walk('late','11:45','11:55')
 const slots=dailySlots(4,[second,first,first,walk('extra','11:56','11:59')],[],day,zone,times)
 expect(slots.map(s=>s.walk?.id)).toEqual(['early','late',undefined,undefined])
})
it('removes deleted walks, restores them, and keeps manually recorded slots separate',()=>{
 const deleted=walk('deleted','09:00','09:30','2026-11-20T10:00Z')
 expect(dailySlots(4,[deleted],[],day,zone,times).every(s=>!s.walk)).toBe(true)
 expect(dailySlots(4,[{...deleted,deleted_at:null}],[],day,zone,times)[0].walk?.id).toBe('deleted')
 const checks:DailyCheck[]=[{id:'manual',dog_id:'dog',member_id:'user',recorded_at:`${day}T09:00Z`,local_day:day,slot:1,deleted_at:null}]
 const slots=dailySlots(4,[walk('actual','10:00','10:30')],checks,day,zone,times)
 expect(slots[0].manual?.id).toBe('manual');expect(slots[1].walk?.id).toBe('actual')
})
it('uses household-local start day and period, with no duplicate carryover after midnight',()=>{
 const w=walk('night','23:30')
 const previous=dailySlots(1,[w],[],'2026-11-20','Europe/Lisbon',['21:00'])
 expect(previous[0].walk?.id).toBe('night')
 expect(dailySlots(1,[{...w,ended_at:'2026-11-21T00:30:00Z'}],[],'2026-11-21','Europe/Lisbon',['21:00'])[0].walk).toBeUndefined()
 expect(dailySlots(1,[w],[],'2026-11-21','Pacific/Kiritimati',['15:00'])[0].walk?.id).toBe('night')
})

it('assigns the first planned afternoon even when estimates are not in clock order',()=>{
 const slots=dailySlots(4,[walk('afternoon','15:30')],[],day,zone,['21:00','17:00','09:00','15:00'])
 expect(slots[1].walk?.id).toBe('afternoon')
 expect(slots[3].walk).toBeUndefined()
})
