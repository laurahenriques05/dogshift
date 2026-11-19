import {expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {WalkDailyOverview} from '../features/walks/WalkDailyOverview'
import {TodaysWalks} from '../features/walks/TodaysWalks'
import type {DailyWalkRoutine} from '../features/walks/useDailyWalkRoutine'
import type {Walk} from '../lib/supabase/database.types'
const routine={day:'2026-11-19',count:undefined,times:[],decided:false,slots:[],done:0,recordedCount:0,loading:false,ready:true,busy:false,error:'',retry:vi.fn(),saveCount:vi.fn(),mark:vi.fn(),undo:vi.fn()} as unknown as DailyWalkRoutine
const overview=(plan:DailyWalkRoutine,walks:Walk[]=[])=>renderToStaticMarkup(<WalkDailyOverview routine={plan} walks={walks} zone="Europe/Lisbon" dogName="Milo" household="example" busy={false} onStart={()=>{}}/>)
it('offers an optional first routine without inventing a goal, last start or next walk',()=>{
 const html=overview(routine)
 expect(html).toContain('<strong>0</strong>');expect(html).not.toContain('NEXT WALK');expect(html).not.toContain('Last recorded start')
 const setup=renderToStaticMarkup(<TodaysWalks routine={routine} user="user" zone="Europe/Lisbon"/> )
 expect(setup).toContain('Set your dog’s walking routine');expect(setup).toContain('No routine for now')
 const declined=renderToStaticMarkup(<TodaysWalks routine={{...routine,decided:true}} user="user" zone="Europe/Lisbon"/> )
 expect(declined).toContain('Walk at your own pace');expect(declined).not.toContain('No routine for now')
})
it('shows chosen optional times without the removed instruction and counts real starts instead of manual checks',()=>{
 const plan={...routine,count:2,times:['08:30',''],slots:[{number:1},{number:2}],recordedCount:7}
 const walk={id:'started',started_at:'2026-11-19T10:00:00Z',ended_at:null,deleted_at:null} as Walk
 const html=overview(plan,[walk,walk]);expect(html).toContain('<strong>1</strong>');expect(html).toContain('NEXT WALK')
 const preview=renderToStaticMarkup(<TodaysWalks routine={plan} user="user" zone="Europe/Lisbon"/> )
 expect(preview).toContain('<time>08:30</time>');expect(preview).not.toContain('Tap a circle')
})
