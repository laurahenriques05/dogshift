import type { DailySlot } from './dailyWalks'
import { nextRoutineSlot } from './routinePresentation'
import { routineOrder } from './routineSchedule'
export function nfcWalkPreview(routine:{ready:boolean;count?:number;scheduleComplete:boolean;slots:DailySlot[];times:string[];names:string[]}) {
 if(!routine.ready||routine.count===undefined||!routine.scheduleComplete)return {title:'Your next walk',time:null}
 const ordered=routineOrder(routine.times).flatMap(index=>routine.slots.filter(slot=>slot.number===index+1))
 const next=nextRoutineSlot(ordered)
 if(!next)return {title:'An extra walk',time:null}
 const name=routine.names[next.number-1]
 return {title:name?name.replace(/^(Morning|Afternoon|Night)(.*)$/,'$1 Walk$2'):'Your next walk',time:routine.times[next.number-1]||null}
}
