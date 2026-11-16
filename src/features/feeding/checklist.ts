import { dayKey } from './model'
import type { MealEvent, PlannedMeal } from './types'
export const outcomeLabels = {given:'Fed',partial:'Partially eaten',refused:'Refused',skipped:'Skipped'}
export function todayChecklist(plan:PlannedMeal[],events:MealEvent[],timezone:string,now=new Date()) {
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now)
 const [clockHour,clockMinute]=clock.split(':').map(Number)
 const nowMinutes=clockHour*60+clockMinute
 const today=dayKey(now,timezone)
 return [...plan].sort((a,b)=>a.time.localeCompare(b.time)).map(meal=>{
  const event=events.filter(e=>!e.deleted_at&&e.routine_meal_id===meal.id&&dayKey(e.occurred_at,timezone)===today).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0]
  const [mealHour,mealMinute]=meal.time.split(':').map(Number)
  const minutesLate=Math.max(0,nowMinutes-(mealHour*60+mealMinute))
  return {meal,event,status:event?outcomeLabels[event.outcome]:meal.time<=clock?'Due':'Upcoming',minutesLate}
 })
}
