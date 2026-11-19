import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../lib/supabase/client'
import type { Walk } from '../../lib/supabase/database.types'
import { validRoutineTimes, type RoutinePlace } from './routineSchedule'
import { localDay } from './gps'
export type DailyCheck={id:string;dog_id:string;local_day:string;slot:number;member_id:string;recorded_at:string;deleted_at:string|null}
export type DailySlot={number:number;walk?:Walk;manual?:DailyCheck}
const client=()=>db() as unknown as SupabaseClient
export function dailySlots(count:number,walks:Walk[],checks:DailyCheck[],day:string,zone:string):DailySlot[]{
 const completed=[...new Map(walks.map(w=>[w.id,w])).values()].filter(w=>w.ended_at&&!w.deleted_at&&localDay(w.ended_at,zone)===day).sort((a,b)=>a.ended_at!.localeCompare(b.ended_at!)||a.id.localeCompare(b.id))
 let next=0
 return Array.from({length:count},(_,index)=>{const number=index+1,manual=checks.find(c=>c.local_day===day&&c.slot===number&&!c.deleted_at);return manual?{number,manual}:{number,walk:completed[next++]}})
}
export async function readDailyWalks(dog:string,day:string){
 const [plan,checks]=await Promise.all([client().from('walk_daily_plans').select('required_count,routine_enabled,estimated_times,place_latitude,place_longitude,place_label').eq('dog_id',dog).maybeSingle(),client().from('walk_daily_checks').select('id,dog_id,local_day,slot,member_id,recorded_at,deleted_at').eq('dog_id',dog).eq('local_day',day).is('deleted_at',null).order('slot')]);if(plan.error)throw plan.error;if(checks.error)throw checks.error
 return {count:plan.data?.routine_enabled?plan.data.required_count as number:undefined,times:(plan.data?.estimated_times??[]) as string[],decided:!!plan.data,place:plan.data?.place_latitude!=null&&plan.data?.place_longitude!=null?{latitude:plan.data.place_latitude,longitude:plan.data.place_longitude,label:plan.data.place_label} as RoutinePlace:null,checks:checks.data as DailyCheck[]}
}
export async function saveDailyCount(dog:string,count:number|undefined,times:string[]=[],place:RoutinePlace|null=null){
 if(count!==undefined&&(!validRoutineTimes(times,count)||!place))throw new Error('Choose a location and an estimated time for every walk.')
 const result=count===undefined?await client().rpc('set_walk_routine',{p_dog:dog,p_count:null,p_times:[]}):await client().rpc('set_walk_routine_schedule',{p_dog:dog,p_times:times,p_latitude:place!.latitude,p_longitude:place!.longitude,p_place:place!.label});if(result.error)throw result.error
}

export async function markDailyWalk(id:string,dog:string,day:string,slot:number){const result=await client().rpc('record_walk_daily_check',{p_id:id,p_dog:dog,p_day:day,p_slot:slot});if(result.error)throw result.error}
export async function undoDailyWalk(id:string){const result=await client().rpc('undo_walk_daily_check',{p_id:id});if(result.error)throw result.error}
