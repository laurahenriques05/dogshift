import type { TaskOccurrence,Walk } from '../../lib/supabase/database.types'
import type { MealEvent,PlannedMeal } from '../feeding/types'
import type { DailyCheck } from '../walks/dailyWalks'
import { dailySlots } from '../walks/dailyWalks'
import { routineNames,validRoutineTimes } from '../walks/routineSchedule'
import { localTime } from '../health/time'
import { outcomeLabels } from '../feeding/checklist'
import type { CalendarEvent } from './model'

export type WalkPlan={dog_id:string;required_count:number;routine_enabled:boolean;estimated_times:string[]}
const dayOf=(at:string,zone:string)=>localTime(at,zone).slice(0,10)

// Resolve ordinary local times without assuming the browser's timezone. On a DST
// gap/fold retain the day and show the stated clock time as an estimate, not a
// fabricated precise instant. The noon anchor is only used to place that day.
export function routineInstant(day:string,time:string,zone:string){
 const base=Date.parse(`${day}T${time}:00Z`)
 const offsets=new Set([-12,0,12].map(hours=>{
  const sample=base+hours*3600000
  return Date.parse(localTime(new Date(sample).toISOString(),zone)+':00Z')-Math.floor(sample/60000)*60000
 }))
 const matches=[...offsets].map(offset=>new Date(base-offset).toISOString()).filter(at=>localTime(at,zone)===`${day}T${time}`)
 if(matches.length===1)return {at:matches[0]}
 return {at:new Date(Date.parse(`${day}T12:00:00Z`)-[...offsets][0]).toISOString(),timeLabel:`${time} · clock change`}
}

export function routineCalendar({month,zone,plan,meals,walkPlan,walks,checks,tasks,now=new Date()}:{
 month:string;zone:string;plan:PlannedMeal[];meals:MealEvent[];walkPlan:WalkPlan|null;
 walks:Walk[];checks:DailyCheck[];tasks:TaskOccurrence[];now?:Date
}):CalendarEvent[]{
 const today=dayOf(now.toISOString(),zone),events:CalendarEvent[]=[]
 const liveMeals=meals.filter(m=>!m.deleted_at),liveWalks=walks.filter(w=>!w.deleted_at),liveChecks=checks.filter(c=>!c.deleted_at)
 const usedMeals=new Set(tasks.flatMap(t=>t.meal_event_id?[t.meal_event_id]:[]))
 const usedWalks=new Set(tasks.flatMap(t=>{const walk=liveWalks.find(w=>w.id===t.walk_id);return walk&&dayOf(t.due_at,zone)===dayOf(walk.started_at,zone)?[walk.id]:[]})),usedChecks=new Set<string>()
 const feedingTaskKeys=new Set(tasks.filter(t=>t.care_kind==='feeding').map(t=>`${t.care_meal_id}:${dayOf(t.due_at,zone)}`))
 const days=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate()
 for(let number=1;number<=days;number++){
  const day=`${month}-${String(number).padStart(2,'0')}`
  // Current routines have no version history. Never invent past planned care.
  if(day<today)continue
  for(const meal of plan){
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time))continue
   const record=liveMeals.filter(m=>m.routine_meal_id===meal.id&&dayOf(m.occurred_at,zone)===day).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0]
   if(record)usedMeals.add(record.id)
   if(feedingTaskKeys.has(`${meal.id}:${day}`))continue
   const when=routineInstant(day,meal.time,zone)
   events.push({id:`routine:feeding:${meal.id}:${day}`,source:'feeding',eventKind:'meal-routine',sourceRecordId:meal.id,title:meal.name,occursAt:when.at,timeLabel:when.timeLabel,remindAt:null,assignedTo:null,href:'/feed',completed:!!record&&record.outcome!=='skipped',status:record?outcomeLabels[record.outcome]:'Planned',estimated:true})
  }
  if(walkPlan?.routine_enabled&&validRoutineTimes(walkPlan.estimated_times,walkPlan.required_count)){
   const names=routineNames(walkPlan.estimated_times)
   for(const slot of dailySlots(walkPlan.required_count,liveWalks,liveChecks,day,zone,walkPlan.estimated_times)){
    const linked=!!slot.walk&&usedWalks.has(slot.walk.id)
    if(slot.walk)usedWalks.add(slot.walk.id)
    if(slot.manual){usedChecks.add(slot.manual.id)}
    if(linked)continue
    const when=routineInstant(day,walkPlan.estimated_times[slot.number-1],zone)
    events.push({id:`routine:walk:${walkPlan.dog_id}:${day}:${slot.number}`,source:'walk',eventKind:'walk-routine',sourceRecordId:walkPlan.dog_id,title:`${names[slot.number-1]} walk`,occursAt:when.at,timeLabel:when.timeLabel,remindAt:null,assignedTo:null,href:'/walks',completed:!!(slot.walk?.ended_at||slot.manual),status:slot.manual||slot.walk?.ended_at?'Completed':slot.walk?'In progress':'Planned',estimated:true})
   }
  }
 }
 // Actual records outside today's/future routine retain their actual timestamps.
 for(const meal of liveMeals){
  if(usedMeals.has(meal.id)||dayOf(meal.occurred_at,zone).slice(0,7)!==month)continue
  // A task is the same scheduled bowl even if the record is currently skipped.
  if(meal.routine_meal_id&&feedingTaskKeys.has(`${meal.routine_meal_id}:${dayOf(meal.occurred_at,zone)}`))continue
  events.push({id:`feeding:meal:${meal.id}`,source:'feeding',eventKind:'meal',sourceRecordId:meal.id,title:meal.meal_name||'Meal',occursAt:meal.occurred_at,remindAt:null,assignedTo:null,href:'/feed',completed:meal.outcome!=='skipped',status:outcomeLabels[meal.outcome]})
 }
 for(const walk of liveWalks){
  if(usedWalks.has(walk.id)||dayOf(walk.started_at,zone).slice(0,7)!==month)continue
  events.push({id:`walk:activity:${walk.id}`,source:'walk',eventKind:'walk',sourceRecordId:walk.id,title:'Recorded walk',occursAt:walk.started_at,remindAt:null,assignedTo:walk.walker_id,href:walk.ended_at?'/walks?view=history':'/walks',completed:!!walk.ended_at,status:walk.ended_at?'Completed':'In progress'})
 }
 for(const check of liveChecks){
  if(usedChecks.has(check.id)||check.local_day.slice(0,7)!==month)continue
  events.push({id:`walk:check:${check.id}`,source:'walk',eventKind:'walk',sourceRecordId:check.id,title:'Walk check-in',occursAt:routineInstant(check.local_day,'12:00',zone).at,timeLabel:'Recorded check-in',remindAt:null,assignedTo:check.member_id,href:'/walks',completed:true,status:'Completed'})
 }
 return events
}
