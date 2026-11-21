import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
import type { Walk } from '../../lib/supabase/database.types'
import type { MealEvent,PlannedMeal } from '../feeding/types'
import type { DailyCheck } from '../walks/dailyWalks'
import type { WalkPlan } from './routineCalendar'
import { readTaskPages } from './data'

export async function loadRoutineCalendarSources(home:string,from:string,until:string,month:string){
 const client=db() as unknown as SupabaseClient
 const [dog,settings,meals,walks]=await Promise.all([
  client.from('dogs').select('id').eq('household_id',home).maybeSingle(),
  client.from('feeding_settings').select('meal_plan').eq('household_id',home).maybeSingle(),
  readTaskPages<MealEvent>((start,end)=>client.from('feeding_meal_events').select('*').eq('household_id',home).gte('occurred_at',from).lt('occurred_at',until).is('deleted_at',null).order('id').range(start,end)),
  readTaskPages<Walk>((start,end)=>client.from('walks').select('id,household_id,dog_id,walker_id,started_at,ended_at,distance_m,notes,end_reason,deleted_at').eq('household_id',home).lt('started_at',until).or(`started_at.gte.${from},ended_at.gte.${from},ended_at.is.null`).is('deleted_at',null).order('id').range(start,end)),
 ])
 if(dog.error)throw dog.error
 if(settings.error)throw settings.error
 let walkPlan:WalkPlan|null=null,checks:DailyCheck[]=[]
 if(dog.data){
  const dogId=dog.data.id
  const next=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10)
  const [plan,result]=await Promise.all([
   client.from('walk_daily_plans').select('dog_id,required_count,routine_enabled,estimated_times').eq('dog_id',dogId).maybeSingle(),
   readTaskPages<DailyCheck>((start,end)=>client.from('walk_daily_checks').select('id,dog_id,local_day,slot,member_id,recorded_at,deleted_at').eq('dog_id',dogId).gte('local_day',`${month}-01`).lt('local_day',next).is('deleted_at',null).order('id').range(start,end)),
  ])
  if(plan.error)throw plan.error
  walkPlan=plan.data as WalkPlan|null;checks=result
 }
 return {plan:(settings.data?.meal_plan||[]) as PlannedMeal[],meals,walkPlan,walks,checks}
}
