import {expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {WalkDailyOverview} from '../features/walks/WalkDailyOverview'
import {TodaysWalks} from '../features/walks/TodaysWalks'
import type {DailyWalkRoutine} from '../features/walks/useDailyWalkRoutine'
import type {Walk} from '../lib/supabase/database.types'
// Isolate presentation from browser configuration and live Supabase initialization.
vi.mock('../lib/supabase/client',()=>({appUrl:'https://pawshare.example',db:()=>{throw new Error('Presentation tests must not access Supabase')}}))
const routine={day:'2026-11-19',count:undefined,times:[],decided:false,slots:[],done:0,recordedCount:0,loading:false,ready:true,busy:false,error:'',retry:vi.fn(),saveCount:vi.fn(),mark:vi.fn(),undo:vi.fn()} as unknown as DailyWalkRoutine
const overview=(plan:DailyWalkRoutine,walks:Walk[]=[])=>renderToStaticMarkup(<WalkDailyOverview routine={plan} walks={walks} zone="Europe/Lisbon" dogName="Milo" busy={false} onStart={()=>{}} onSetupTag={()=>{}}/>)
it('offers an optional first routine without inventing a goal, last start or next walk',()=>{
 const html=overview(routine)
 expect(html).toContain('<strong>0</strong>');expect(html).not.toContain('NEXT WALK');expect(html).not.toContain('Last recorded start')
 const setup=renderToStaticMarkup(<TodaysWalks routine={routine} user="user" zone="Europe/Lisbon"/> )
 expect(setup).toContain('Walking routine');expect(setup).toContain('Set routine');expect(setup).not.toContain('No routine for now');expect(setup).toMatch(/walk-routine-edit-tile[^>]*disabled/)
 const declined=renderToStaticMarkup(<TodaysWalks routine={{...routine,decided:true}} user="user" zone="Europe/Lisbon"/> )
 expect(declined).toContain('Walking routine');expect(declined).not.toContain('No routine for now')
})
it('shows required estimated times without the removed instruction and counts real starts instead of manual checks',()=>{
 const plan={...routine,count:2,times:['08:30','21:00'],scheduleComplete:true,names:['Morning','Night'],slots:[{number:1},{number:2}],recordedCount:7}
 const walk={id:'started',started_at:'2026-11-19T10:00:00Z',ended_at:null,deleted_at:null} as Walk
 const html=overview(plan,[walk,walk]);expect(html).toContain('<strong>1</strong>');expect(html).toContain('NEXT WALK')
 const preview=renderToStaticMarkup(<TodaysWalks routine={plan} user="user" zone="Europe/Lisbon"/> )
 expect(preview).toContain('Today’s walk');expect(preview).not.toMatch(/walk-routine-edit-tile[^>]*disabled/);expect(preview).not.toContain('<time>');expect(preview).not.toContain('Summary');expect(preview).not.toContain('Tap a circle')
})

it('keeps legacy routines honest until missing estimated times are completed',()=>{
 const legacy={...routine,count:2,times:['',''],scheduleComplete:false,names:['',''],slots:[{number:1},{number:2}]}
 expect(overview(legacy)).not.toContain('NEXT WALK')
 expect(renderToStaticMarkup(<TodaysWalks routine={legacy} user="user" zone="Europe/Lisbon"/>)).toContain('Complete your routine')
})

it('shows Summary only for completed routine slots',()=>{
 const plan={...routine,count:2,scheduleComplete:true,times:['09:00','20:00'],names:['Morning','Night'],slots:[{number:1,walk:{id:'done',ended_at:'2026-11-19T10:00Z'} as Walk},{number:2}]}
 const html=renderToStaticMarkup(<TodaysWalks routine={plan} user="user" zone="Europe/Lisbon"/>)
 expect(html.match(/>Summary</g)).toHaveLength(1)
 expect(html).not.toContain('<time>')
})

it('shows a filled in-progress circle without claiming completion or exposing Summary',()=>{
 const plan={...routine,count:1,scheduleComplete:true,times:['09:00'],names:['Morning'],slots:[{number:1,walk:{id:'active',started_at:'2026-11-20T09:00Z',ended_at:null} as Walk}]}
 const html=renderToStaticMarkup(<TodaysWalks routine={plan} user="user" zone="Europe/Lisbon"/>)
 expect(html).toContain('Morning in progress');expect(html).toContain('is-in-progress');expect(html).not.toContain('>Summary<')
})
