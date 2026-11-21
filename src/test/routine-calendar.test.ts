import {expect,it} from 'vitest'
import {routineCalendar,routineInstant,type WalkPlan} from '../features/tasks/routineCalendar'
import type {MealEvent,PlannedMeal} from '../features/feeding/types'
import type {TaskOccurrence,Walk} from '../lib/supabase/database.types'
import type {DailyCheck} from '../features/walks/dailyWalks'
const plan:PlannedMeal[]=[{id:'dinner',name:'Dinner',time:'19:00',notes:'',items:[]}]
const walkPlan:WalkPlan={dog_id:'dog',required_count:2,routine_enabled:true,estimated_times:['08:00','18:00']}
const base={month:'2026-11',zone:'Europe/Lisbon',plan,walkPlan,meals:[] as MealEvent[],walks:[] as Walk[],checks:[] as DailyCheck[],tasks:[] as TaskOccurrence[],now:new Date('2026-11-21T12:00Z')}
const meal=(extra:Partial<MealEvent>={})=>({id:'meal',routine_meal_id:'dinner',meal_name:'Dinner',occurred_at:'2026-11-21T19:05Z',outcome:'given',deleted_at:null,...extra}) as MealEvent
const walk=(extra:Partial<Walk>={})=>({id:'walk',started_at:'2026-11-21T08:05Z',ended_at:'2026-11-21T08:30Z',deleted_at:null,walker_id:'person',...extra}) as Walk
it('projects each daily routine without saving or inventing historical plans; extras stay independent',()=>{
 const events=routineCalendar(base)
 expect(events).toHaveLength(10*3)
 expect(events.filter(e=>e.occursAt.startsWith('2026-11-20'))).toHaveLength(0)
 expect(events.find(e=>e.id==='routine:feeding:dinner:2026-11-21')).toMatchObject({href:'/feed',completed:false,status:'Planned'})
 expect(events.find(e=>e.id==='routine:walk:dog:2026-11-21:1')).toMatchObject({href:'/walks',estimated:true,status:'Planned'})
 const extra={id:'extra',care_kind:'walk',due_at:'2026-11-21T12:00Z'} as TaskOccurrence
 expect(routineCalendar({...base,tasks:[extra]})).toHaveLength(events.length)
})
it('reflects saved meal outcomes, walk completion/manual checks and corrections using source logic',()=>{
 const check={id:'check',dog_id:'dog',slot:2,local_day:'2026-11-21',recorded_at:'2026-11-21T18:00Z',deleted_at:null} as DailyCheck
 let events=routineCalendar({...base,meals:[meal()],walks:[walk()],checks:[check]})
 expect(events.filter(e=>e.completed)).toHaveLength(3)
 expect(events.filter(e=>e.id==='feeding:meal:meal')).toHaveLength(0)
 expect(events.filter(e=>e.id==='walk:activity:walk')).toHaveLength(0)
 events=routineCalendar({...base,meals:[meal({outcome:'skipped'})],walks:[walk({ended_at:null})],checks:[{...check,deleted_at:'2026-11-21T19:00Z'}]})
 expect(events.find(e=>e.id==='routine:feeding:dinner:2026-11-21')).toMatchObject({completed:false,status:'Skipped'})
 expect(events.find(e=>e.id==='routine:walk:dog:2026-11-21:1')).toMatchObject({completed:false,status:'In progress'})
 expect(events.find(e=>e.id==='routine:walk:dog:2026-11-21:2')?.completed).toBe(false)
 expect(routineCalendar({...base,meals:[meal({deleted_at:'2026-11-21T20:00Z'})]}).find(e=>e.id==='routine:feeding:dinner:2026-11-21')?.status).toBe('Planned')
})
it('deduplicates explicitly linked tasks without guessing which extra walk matches a routine',()=>{
 const feeding={id:'f',care_kind:'feeding',care_meal_id:'dinner',due_at:'2026-11-21T22:00Z',meal_event_id:'meal'} as TaskOccurrence
 const walking={id:'w',care_kind:'walk',due_at:'2026-11-21T08:00Z',walk_id:'walk'} as TaskOccurrence
 const events=routineCalendar({...base,tasks:[feeding,walking],meals:[meal()],walks:[walk()]})
 expect(events.some(e=>e.id==='routine:feeding:dinner:2026-11-21')).toBe(false)
 expect(events.some(e=>e.id==='routine:walk:dog:2026-11-21:1')).toBe(false)
 expect(events.some(e=>e.id==='feeding:meal:meal'||e.id==='walk:activity:walk')).toBe(false)
})
it('keeps actual past and additional activities after routines are removed',()=>{
 const events=routineCalendar({...base,plan:[],walkPlan:null,meals:[meal({occurred_at:'2026-11-18T19:00Z'})],walks:[walk({started_at:'2026-11-18T08:00Z',ended_at:'2026-11-18T08:30Z'})]})
 expect(events.map(e=>e.id)).toEqual(['feeding:meal:meal','walk:activity:walk'])
 expect(events.every(e=>e.completed)).toBe(true)
})
it('uses household local days and honest clock-change labels',()=>{
 expect(routineInstant('2026-07-01','08:00','Europe/Lisbon').at).toBe('2026-07-01T07:00:00.000Z')
 expect(routineInstant('2026-03-29','01:30','Europe/Lisbon').timeLabel).toBe('01:30 · clock change')
 expect(routineInstant('2026-10-25','01:30','Europe/Lisbon').timeLabel).toBe('01:30 · clock change')
 const events=routineCalendar({...base,zone:'Pacific/Auckland',now:new Date('2026-11-20T12:00Z')})
 expect(events[0].id).toBe('routine:feeding:dinner:2026-11-21')
})

it('retains today’s actual routine when an overdue task was scheduled on another day',()=>{
 const oldTask={id:'old',care_kind:'walk',walk_id:'walk',due_at:'2026-11-20T08:00Z'} as TaskOccurrence
 expect(routineCalendar({...base,tasks:[oldTask],walks:[walk()]}).find(e=>e.id==='routine:walk:dog:2026-11-21:1')).toMatchObject({completed:true})
})
