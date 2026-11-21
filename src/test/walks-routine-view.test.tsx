import { dailySlots, completedDailySlot, type DailyCheck } from '../features/walks/dailyWalks'
import { routineCalendar } from '../features/tasks/routineCalendar'
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
 expect(setup.indexOf('Set routine')).toBeLessThan(setup.indexOf('Edit routine'));expect(setup).not.toContain('Walking without a routine.');
 expect(setup).toContain('Walking routine');expect(setup).toContain('Set routine');expect(setup).not.toContain('No routine for now');expect(setup).toMatch(/walk-routine-edit-tile[^>]*disabled/)
 const declined=renderToStaticMarkup(<TodaysWalks routine={{...routine,decided:true}} user="user" zone="Europe/Lisbon"/> )
 expect(declined).toContain('Walking routine');expect(declined).not.toContain('No routine for now')
})
it('shows required estimated times and never counts an unfinished start as completed',()=>{
 const plan={...routine,count:2,times:['08:30','21:00'],scheduleComplete:true,names:['Morning','Night'],slots:[{number:1},{number:2}],recordedCount:7}
 const walk={id:'started',started_at:'2026-11-19T10:00:00Z',ended_at:null,deleted_at:null} as Walk
 const html=overview(plan,[walk,walk]);expect(html).toContain('<strong>0</strong>');expect(html).toContain('NEXT WALK')
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

it('uses full Walk names in the next-walk heading while keeping circle names short',()=>{
 for(const name of ['Morning','Afternoon 1','Night']){
  const plan={...routine,count:1,times:['09:00'],scheduleComplete:true,names:[name],slots:[{number:1}]}
  expect(overview(plan)).toContain(`<h2 id="walk-next-title">${name.replace(/^(Morning|Afternoon|Night)(.*)$/, '$1 Walk$2')}</h2>`)
 }
})

it('keeps the Start walk count, completed circles and calendar on the same explicit evidence',()=>{
 const day='2026-11-19',times=['09:00','15:00','21:00'],now=new Date(`${day}T23:59:00Z`)
 const recorded={id:'recorded',dog_id:'dog',started_at:`${day}T09:10:00Z`,ended_at:`${day}T09:30:00Z`,deleted_at:null} as Walk
 const active={...recorded,id:'active',started_at:`${day}T15:10:00Z`,ended_at:null}
 const checked={id:'check',dog_id:'dog',member_id:'member',slot:3,local_day:day,recorded_at:`${day}T21:05:00Z`,deleted_at:null} as DailyCheck
 const project=(walks:Walk[],checks:DailyCheck[])=>{
  const slots=dailySlots(3,walks,checks,day,'Europe/Lisbon',times)
  const plan={...routine,day,count:3,times,scheduleComplete:true,names:['Morning','Afternoon','Night'],slots,done:slots.filter(completedDailySlot).length}
  const calendar=routineCalendar({month:'2026-11',zone:'Europe/Lisbon',plan:[],meals:[],walkPlan:{dog_id:'dog',required_count:3,routine_enabled:true,estimated_times:times},walks,checks,tasks:[],now})
  return {slots,hero:overview(plan,walks),circles:renderToStaticMarkup(<TodaysWalks routine={plan} user="member" zone="Europe/Lisbon"/>),completed:calendar.filter(event=>event.completed).length}
 }
 const noEvidence=project([],[])
 expect(noEvidence.hero).toContain('<strong>0</strong>');expect(noEvidence.completed).toBe(0)
 const saved=project([recorded,active],[checked])
 expect(saved.hero).toContain('<strong>2</strong>');expect(saved.hero).toContain('of 3 walks completed today')
 expect(saved.circles.match(/>Summary</g)).toHaveLength(2);expect(saved.completed).toBe(2)
 const removed=project([{...recorded,deleted_at:now.toISOString()},active],[{...checked,deleted_at:now.toISOString()}])
 expect(removed.hero).toContain('<strong>0</strong>');expect(removed.circles).not.toContain('>Summary<');expect(removed.completed).toBe(0)
})
