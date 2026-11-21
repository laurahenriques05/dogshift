import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
import type { Walk } from '../../lib/supabase/database.types'
import { routineOrder, routinePeriod, validRoutineTimes } from './routineSchedule'
import { localDay } from './gps'
export type DailyCheck={id:string;dog_id:string;local_day:string;slot:number;member_id:string;recorded_at:string;deleted_at:string|null}
export type DailySlot={number:number;walk?:Walk;manual?:DailyCheck}
export function completedDailySlot(slot:DailySlot){return !!((slot.manual&&!slot.manual.deleted_at)||(slot.walk?.ended_at&&!slot.walk.deleted_at))}
const client=()=>db() as unknown as SupabaseClient
export function dailySlots(count:number,walks:Walk[],checks:DailyCheck[],day:string,zone:string,times:string[]=[]):DailySlot[]{
 const slots:DailySlot[]=Array.from({length:count},(_,index)=>{const number=index+1,manual=checks.find(c=>c.local_day===day&&c.slot===number&&!c.deleted_at);return manual?{number,manual}:{number}})
 const unique=[...new Map(walks.map(w=>[w.id,w])).values()].filter(w=>!w.deleted_at)
 // Legacy count-only plans retain their completed-outing order until configured.
 if(!validRoutineTimes(times,count)){
  const completed=unique.filter(w=>w.ended_at&&localDay(w.ended_at,zone)===day).sort((a,b)=>a.ended_at!.localeCompare(b.ended_at!)||a.id.localeCompare(b.id))
  let next=0
  return slots.map(slot=>slot.manual?slot:{...slot,walk:completed[next++]})
 }
 const orderedSlots=routineOrder(times).map(index=>slots[index])
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
 for(const walk of unique.filter(w=>localDay(w.started_at,zone)===day).sort((a,b)=>a.started_at.localeCompare(b.started_at)||a.id.localeCompare(b.id))){
  const period=routinePeriod(clock.format(new Date(walk.started_at)))
  const slot=orderedSlots.find(item=>!item.walk&&!item.manual&&routinePeriod(times[item.number-1])===period)
  if(slot)slot.walk=walk
 }
 return slots
}
export async function readDailyWalks(dog:string,day:string){
 const [plan,checks]=await Promise.all([client().from('walk_daily_plans').select('required_count,routine_enabled,estimated_times').eq('dog_id',dog).maybeSingle(),client().from('walk_daily_checks').select('id,dog_id,local_day,slot,member_id,recorded_at,deleted_at').eq('dog_id',dog).eq('local_day',day).is('deleted_at',null).order('slot')]);if(plan.error)throw plan.error;if(checks.error)throw checks.error
 return {count:plan.data?.routine_enabled?plan.data.required_count as number:undefined,times:(plan.data?.estimated_times??[]) as string[],decided:!!plan.data,checks:checks.data as DailyCheck[]}
}
export async function saveDailyCount(dog:string,count:number|undefined,times:string[]=[]){
 if(count!==undefined&&!validRoutineTimes(times,count))throw new Error('Choose an estimated hour for every walk.')
 const result=await client().rpc('set_walk_routine',{p_dog:dog,p_count:count??null,p_times:count===undefined?[]:times});if(result.error)throw result.error
}

export async function markDailyWalk(id:string,dog:string,day:string,slot:number){const result=await client().rpc('record_walk_daily_check',{p_id:id,p_dog:dog,p_day:day,p_slot:slot});if(result.error)throw result.error}
export async function undoDailyWalk(id:string){const result=await client().rpc('undo_walk_daily_check',{p_id:id});if(result.error)throw result.error}
