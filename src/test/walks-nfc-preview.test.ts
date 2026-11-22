import { expect,it } from 'vitest'
import type { Walk } from '../lib/supabase/database.types'
import { nfcWalkPreview } from '../features/walks/nfcPreview'
const plan={ready:true,count:3,scheduleComplete:true,times:['09:00','14:30','22:00'],names:['Morning','Afternoon','Night'],slots:[{number:1,walk:{id:'saved'} as Walk},{number:2},{number:3}]}
it('previews the next genuinely unfinished slot without recording it',()=>{
 const before=JSON.stringify(plan)
 expect(nfcWalkPreview(plan)).toEqual({title:'Afternoon Walk',time:'14:30'})
 expect(JSON.stringify(plan)).toBe(before)
})
it('does not invent a routine time before a complete saved routine is available',()=>{
 expect(nfcWalkPreview({...plan,ready:false})).toEqual({title:'Your next walk',time:null})
 expect(nfcWalkPreview({...plan,scheduleComplete:false})).toEqual({title:'Your next walk',time:null})
 expect(nfcWalkPreview({...plan,count:undefined})).toEqual({title:'Your next walk',time:null})
})
it('offers an extra walk after all saved slots and preserves numbered period names',()=>{
 expect(nfcWalkPreview({...plan,slots:plan.slots.map(slot=>({...slot,walk:{id:'saved'} as Walk}))})).toEqual({title:'An extra walk',time:null})
 expect(nfcWalkPreview({...plan,names:['Morning','Afternoon 1','Afternoon 2']})).toEqual({title:'Afternoon Walk 1',time:'14:30'})
})
