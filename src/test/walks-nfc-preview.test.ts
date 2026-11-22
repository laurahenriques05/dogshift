import { expect,it } from 'vitest'
import type { Walk } from '../lib/supabase/database.types'
import { nfcWalkPreview } from '../features/walks/nfcPreview'
const now=new Date('2026-11-22T22:30:00Z')
const preview=(routine:Parameters<typeof nfcWalkPreview>[0])=>nfcWalkPreview(routine,now,'Europe/Lisbon')
const plan={ready:true,count:3,scheduleComplete:true,times:['09:00','14:30','22:00'],names:['Morning','Afternoon','Night'],slots:[{number:1,walk:{id:'saved'} as Walk},{number:2},{number:3}]}
it('previews the next genuinely unfinished slot without recording it',()=>{
 const before=JSON.stringify(plan)
 expect(preview(plan)).toEqual({title:'Afternoon Walk',time:'14:30'})
 expect(JSON.stringify(plan)).toBe(before)
})
it('does not invent a routine time before a complete saved routine is available',()=>{
 expect(preview({...plan,ready:false})).toEqual({title:'Night Walk',time:null})
 expect(preview({...plan,scheduleComplete:false})).toEqual({title:'Night Walk',time:null})
 expect(preview({...plan,count:undefined})).toEqual({title:'Night Walk',time:null})
})
it('names additional outings by their local period and preserves numbered period names',()=>{
 expect(preview({...plan,slots:plan.slots.map(slot=>({...slot,walk:{id:'saved'} as Walk}))})).toEqual({title:'Night Walk',time:'22:00'})
 expect(preview({...plan,names:['Morning','Afternoon 1','Afternoon 2']})).toEqual({title:'Afternoon Walk 1',time:'14:30'})
})

it('uses the household timezone and the closest numbered slot in a completed period',()=>{
 const completed={...plan,times:['14:00','18:00'],names:['Afternoon 1','Afternoon 2'],slots:[{number:1,walk:{id:'one'} as Walk},{number:2,walk:{id:'two'} as Walk}]}
 expect(nfcWalkPreview(completed,new Date('2026-11-22T17:30:00Z'),'Europe/Lisbon')).toEqual({title:'Afternoon Walk 2',time:'18:00'})
 expect(nfcWalkPreview({...completed,count:undefined},new Date('2026-11-22T21:30:00Z'),'Pacific/Kiritimati')).toEqual({title:'Morning Walk',time:null})
})
